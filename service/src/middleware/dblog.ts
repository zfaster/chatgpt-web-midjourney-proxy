import {pool} from "./db";

export class DBLogger {
	static logRequest(reqId, token_info, bodyContent) {
		//如果body是空对象则不记录
		if (bodyContent === '{}') {
			return;
		}
		pool.query('INSERT INTO t_log SET ?', {
			id: reqId,
			uid: token_info.user_id,
			username: token_info.user.name,
			dept: token_info.user.description,
			// req_body: req_body,
			create_time: new Date()
		}, function (error) {
			if (error) throw error;
		});
	}

	static logResponse(reqId, proxyResData) {
		return;
		const resp = proxyResData.toString('utf8');
		pool.query('UPDATE t_log SET resp = ? WHERE id = ?', [resp, reqId], function (error) {
			if (error) throw error;
		});
	}
}

export default  DBLogger;
