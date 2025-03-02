import mysql from "mysql"
var pool  = mysql.createPool({
	connectionLimit : 10, // 连接池中最多可以有10个连接
	host            : process.env.DB_HOST, // 数据库服务器地址
	port						: parseInt(process.env.DB_PORT),
	user            : process.env.DB_USER, // 数据库用户名
	password        : process.env.DB_PWD, // 数据库密码
	database        : process.env.DB_NAME // 数据库名
});
pool.query('SELECT 1', (error, results) => {
	if (error) {
		console.error('Database connection failed: ', error);
	} else {
		console.log('Database connected successfully.');
	}
});

export {pool};
