import { isNotEmptyString } from '../utils/is'
import { Request, Response, NextFunction } from 'express';
import FormData from 'form-data';
import fetch from 'node-fetch';
import md5 from 'md5';
import axios from "axios";
import {decryptDes, encryptDes, getMD5Value, randomString} from "../md5";
import {createRequire} from "module";
import NodeCache from 'node-cache';
import {pool} from "./db";

const require = createRequire(import.meta.url);
const winston = require('winston');

require('winston-daily-rotate-file');
let POD_NAME = process.env.POD_NAME
if (!POD_NAME) {
	POD_NAME = "localhost"
}
let log_file_path = '/logs/' + POD_NAME + '/'
// 创建一个每天旋转的文件传输
const transport = new winston.transports.DailyRotateFile({
	filename: log_file_path + '/%DATE%.log',
	datePattern: 'YYYY-MM-DD',
});
const logger = winston.createLogger({
	format: winston.format.combine(
		// 添加时间前缀
		winston.format.timestamp(),
		winston.format.printf(({timestamp, message}) => `${timestamp} ${message}`)
	),
	transports: [
		transport,
		// 打印到控制台
		new winston.transports.Console(),
	],
});
// 存储IP地址和错误计数的字典
const ipErrorCount = {};

// 存储被禁止登录的IP地址及禁止结束时间的字典
const bannedIPs = {};

export const mlog =(...arg)=>{
  //const M_DEBUG = process.env.M_DEBUG
  // if(['error','log'].indexOf( arg[0] )>-1 ){ //必须显示的
  // }else  if(! isNotEmptyString(process.env.M_DEBUG) ) return ;

  const currentDate = new Date();
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds = currentDate.getSeconds().toString().padStart(2, '0');
  const currentTime = `${hours}:${minutes}:${seconds}`;
  console.log( currentTime,...arg)
}

export const verify=  async ( req :Request , res:Response ) => {
	checkLimit(req, res);
	const {username, token} = req.body as { username: string, token: string }
	if (!token || !username)
		throw new Error('用户名或密码为空')
	// 检查数据库白名单
	pool.query('SELECT * FROM t_user where id = ?', [username], async function (error, results, fields) {
		try {
			if (error) throw error; // 处理查询错误
			if (!results) {
				throw new Error('当前用户暂无权限登录');
			}
			const users = results.map(item => ({id: item.id, auth: item.auth,models:item.models})); // 从查询结果中获取用户列表
			const user = users[0]
			// console.log('results', users)

			//获取session
			let UC_GATEWAY_URL = process.env.UC_GATEWAY
			if (!isNotEmptyString(UC_GATEWAY_URL)) {
				UC_GATEWAY_URL = "https://uc-gateway.sdp.101.com"
			}
			const src_device_id = randomString(20)
			let check_char = getMD5Value(src_device_id)[2];
			check_char = btoa(getMD5Value(src_device_id))[2];
			//
			const device_type = "w";
			const device_id = check_char + device_type + src_device_id;
			let session_info = null;
			try {
				session_info = await axios.post("https://uc-gateway.sdp.101.com/v1.1/sessions", {device_id: device_id}, {headers: {'Content-Type': 'application/json'}})
			} catch (e) {
				if (e.response) {
					throw new Error(e.response.data.message)
				} else {
					throw new Error("获取session失败")
				}
			}

			const login_name = encryptDes(username, session_info.data.session_key);
			const account_type = "org";
			const org_code = "nd";
			const password = encryptDes(token, session_info.data.session_key);
			const session_id = session_info.data.session_id;
			//调用uc接口进行登录
			try {
				const login_result = await axios.post(UC_GATEWAY_URL + "/v1.1/tokens", {
					login_name: login_name,
					account_type: account_type,
					org_code: org_code,
					password: password,
					session_id: session_id
				}, {headers: {'Content-Type': 'application/json'}})
				const user_id = decryptDes(login_result.data.user_id, session_info.data.session_key);
				const mac_key = decryptDes(login_result.data.mac_key, session_info.data.session_key);
				//获取公开信息
				const user_info_result = await axios.get(UC_GATEWAY_URL + "/v1.1/public/users/" + user_id, {headers: {'Content-Type': 'application/json'}})
				const nick_name = user_info_result.data.nick_name
				const avatar_data = user_info_result.data.avatar_data
				let description = ''
				if (user_info_result.data.node_items && user_info_result.data.node_items.length > 0) {
					description = user_info_result.data.node_items[0].node_name
				}
				const token_info = {
					"access_token": login_result.data.access_token,
					"user": {
						name: nick_name,
						avatar: "http://cdncs.101.com/v0.1/download?dentryId=" + avatar_data,
						description: description
					},
					"auth":user.auth,
					"models":user.models,
					"mac_key": mac_key,
					"user_id": user_id
				}
				addKeyValue(login_result.data.access_token, token_info)
				clearLimit(req, res);
				// res.send({ status: 'Fail', message: "", data: token_info })
				res.send({status: 'Success', message: '登录成功', data: token_info})
			} catch (e) {
				if (e.response) {
					throw new Error(e.response.data.message)
				}
			}
		} catch (error) {
			res.send({status: 'Fail', message: error.message, data: null})
		}
	})

}
// 添加键值对到对象
function addKeyValue(key, value) {
	login_token[key] = value;
}
//存储当前的登录信息
export const login_token = new NodeCache({stdTTL: 3600 * 24 * 7});
// 从对象中获取值
export function getValue(key) {
	return login_token[key];
}
export const auth = async ( req :Request , res:Response , next:NextFunction ) => {


  const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
  if (isNotEmptyString(AUTH_SECRET_KEY)) {
    try {
      checkLimit( req, res );
      const Authorization = req.header('Authorization')
      if (!Authorization || Authorization.replace('Bearer ', '').trim() !== AUTH_SECRET_KEY.trim())
        throw new Error('Error: 无访问权限 | No access rights')

      clearLimit( req, res);
      next()
    }
    catch (error) {
      res.send({ status: 'Unauthorized', message: error.message ?? 'Please authenticate.', data: null })
    }
  }
  else {
    next()
  }
}

const getIp= ( req :Request)=>{
  if (req.header && req.header('x-forwarded-for')) return req.header('x-forwarded-for');
  return  req.ip;
}
const checkLimit=  ( req :Request , res:Response )=>{
  if ( !isNotEmptyString( process.env.AUTH_SECRET_ERROR_COUNT )) {
    return ;
  }

  const bTime = process.env.AUTH_SECRET_ERROR_TIME??10;
  // 允许的最大错误次数
  const maxErrorCount =  +process.env.AUTH_SECRET_ERROR_COUNT;
  // 禁止登录的时间（毫秒）
  let banTime = (+bTime) * 60*1000; // 10分钟
  if( banTime<=0 ) banTime= 10*60*1000;

  const ipAddress =getIp(req);

   if (bannedIPs[ipAddress] && Date.now() < bannedIPs[ipAddress]) {
    const timeLeft = Math.ceil((bannedIPs[ipAddress] - Date.now()) / 1000);
    console.log("myIP ",ipAddress,  ipErrorCount[ipAddress]  );
    //return res.status(403).send(`IP地址被禁止登录，剩余时间: ${timeLeft}秒`);
     let ts = timeLeft>60? (timeLeft/60).toFixed(0)+'分钟':  timeLeft+'秒'
     throw new Error(`Error: ${ipAddress} 验证次数过多，请在${ts}后重试！`)
  }
  ipErrorCount[ipAddress] = ipErrorCount[ipAddress]?(  ipErrorCount[ipAddress]+1) : 1;
  if (ipErrorCount[ipAddress] >= maxErrorCount) {
      bannedIPs[ipAddress] = Date.now() + banTime;
  }
}
const clearLimit=  ( req :Request , res:Response )=>{
  const ipAddress =getIp(req);
  bannedIPs[ipAddress] = 0;
  ipErrorCount[ipAddress]= 0;
}

export const authV2 = async ( req :Request , res:Response , next:NextFunction ) => {

	const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY

	if (isNotEmptyString(AUTH_SECRET_KEY)) {
		try {

			checkLimit(req, res);
			const Authorization = req.header('X-Ptoken')
			if (!Authorization)
				throw new Error('Error: 无访问权限 | No access rights')
			const token_info = getValue(Authorization)
			if (!token_info)
				throw new Error('Error: 无访问权限 | No access rights')
			clearLimit(req, res);
			if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
				let { base64Array, ...restBody } = req.body;
				let req_body = JSON.stringify(restBody);
				logger.info('用户：' + token_info.user.name + '(' + token_info.user_id + ') 访问了接口：' + req.url + ' body:' + req_body);
			}
			next();
			//throw new Error('Error: 无访问权限 | No access rights')
		} catch (error) {
			res.status(423);
			res.send({code: 'token_check', message: error.message ?? 'Please authenticate.', data: null})
		}
	} else {
		next()
	}
}

export const turnstileCheck= async ( req :Request , res:Response , next:NextFunction ) => {

   const TURNSTILE_SITE = process.env.TURNSTILE_SITE
    if (!isNotEmptyString(TURNSTILE_SITE)) {
      next();
      return ;
    }
    //TURNSTILE_NO_CHECK
    if ( isNotEmptyString( process.env.TURNSTILE_NO_CHECK)) { //前端显示当时后端不check
       next();
       return ;
    }
    try{
      if( checkCookie( req ) ) {
        next();
        return ;
      }
      const Authorization = req.header('X-Vtoken')
        if ( !Authorization  )  throw new Error('无权限访问,请刷新重试 | No access rights by Turnstile')

      const SECRET_KEY=  process.env.TURNSTILE_SECRET_KEY
      let formData = new FormData();
      formData.append('secret', SECRET_KEY);
      formData.append('response', Authorization);
      //formData.append('remoteip', ip);

      const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          body: formData,
          method: 'POST',
      });

      const outcome:any = await result.json();
      //console.log('outcome>> ', outcome );
      if (!outcome.success)   throw new Error('无权限访问,请刷新重试 | No access rights by Turnstile')

      next();
    }catch (error) {
      res.status(422);
      mlog( 'Turnstile_Error')
      res.send({ code: 'Turnstile_Error', message: error.message ?? 'Please authenticate.'  })
    }

    //throw new Error('Error: 无访问权限 | No access rights by Turnstile')



}

const getCookie=( time:string )=>{
  return time+'_'+(md5(time + process.env.TURNSTILE_SECRET_KEY ).substring(0,10) );
}
export const regCookie= async( req :Request , res:Response , next:NextFunction )=>{
  try{
      const Authorization = req.header('X-Vtoken')
        if ( !Authorization ) throw new Error('Turnstile token 缺失')

      const SECRET_KEY=  process.env.TURNSTILE_SECRET_KEY
      let formData = new FormData();
      formData.append('secret', SECRET_KEY);
      formData.append('response', Authorization);
      //formData.append('remoteip', ip);

      const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          body: formData,
          method: 'POST',
      });

      const outcome:any = await result.json();
      //console.log('outcome>> ', outcome );
      if (!outcome.success)   throw new Error('Turnstile 错误,请刷新重试 | No access rights by Turnstile')
      const now= `${ (Date.now()/1000).toFixed(0)}`;

      res.status(200);
      //req.cookies.username;
      //res.cookie('gptmj',  getCookie( now ), { maxAge: 5*3600*1000, httpOnly: true });
      res.send({ok:'ok' ,ctoken: getCookie( now ) })
    }catch (error) {
      res.status(422);
       mlog('reg_cookie error ');
      res.send({ code: 'reg_cookie', message: error.message ?? 'Please authenticate.'  })
    }
}

const checkCookie= ( req :Request ):boolean=>{
   //console.log( 'cookies : ',  req.header('X-Ctoken')  );
   if( ! req.header('X-Ctoken')) return false;
   const gptmj =  req.header('X-Ctoken') as string;
   if( gptmj==getCookie(  gptmj.split('_')[0]) ) {
     mlog('cookie ok ');
     return true;
   }
   return false;
}

///export { auth }
