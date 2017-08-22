var log4js = require('log4js');
var _ = require('underscore');

module.exports = function (common) {

    common.disableRemoteMethodByName("create", true);
    common.disableRemoteMethodByName("upsert", true);
    common.disableRemoteMethodByName("updateAll", true);
    common.disableRemoteMethodByName("updateAttributes", false);

    common.disableRemoteMethodByName("find", true);
    common.disableRemoteMethodByName("findById", true);
    common.disableRemoteMethodByName("findOne", true);

    common.disableRemoteMethodByName("deleteById", true);

    common.disableRemoteMethodByName("confirm", true);
    common.disableRemoteMethodByName("count", true);
    common.disableRemoteMethodByName("exists", true);
    common.disableRemoteMethodByName("resetPassword", true);

    common.disableRemoteMethodByName('__count__accessTokens', false);
    common.disableRemoteMethodByName('__create__accessTokens', false);
    common.disableRemoteMethodByName('__delete__accessTokens', false);
    common.disableRemoteMethodByName('__destroyById__accessTokens', false);
    common.disableRemoteMethodByName('__findById__accessTokens', false);
    common.disableRemoteMethodByName('__get__accessTokens', false);
    common.disableRemoteMethodByName('__updateById__accessTokens', false);

    resNULLCB = function (err, result) {
        if (err) {
            EWTRACEIFY(err);
            throw err;
        }

    }

    DelOKPacket = function (result) {
        if (result && _.isArray(result)) {
            var mr = _.find(result, function (item) {
                return item.fieldCount != undefined;
            });
            if (mr) {
                var r = _.find(result, function (item) {
                    return item.fieldCount == undefined;
                });
                if (r) {
                    result = r;
                }
            }
        }
        return result;
    };

    DoSQL = function (SQL, Connect) {
        __DoSQL = function (SQL, resolve, reject, Connect) {
            EWTRACE(SQL);

            var dataSource = Connect;
            if (dataSource == undefined)
                dataSource = common.app.datasources.commondb;

            dataSource.connector.execute(SQL, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    var _result = DelOKPacket(result);
                    if (_.isEmpty(_result) || _result.length == 0) {
                        _result = [];
                        resolve(_result);
                    }
                    else {
                        resolve(_result);
                    }

                }
            });
        }

        return new Promise(function (resolve, reject) {
            __DoSQL(SQL, resolve, reject, Connect);
        });
    }

    _ExecuteSQL = function (SQL, tx, Connect, resultFun) {
        try {
            EWTRACE(SQL);
            var dataSource = Connect;
            if (dataSource == undefined)
                dataSource = common.app.datasources.commondb;

            dataSource.connector.executeSQL(SQL, {}, { transaction: tx }, resultFun);
        } catch (ex) {
            throw ex;
        }
    }

    ExecuteSyncSQLResult = function (bsSQL, ResultObj, tx, Connect) {
        return new Promise(function (resolve, reject) {
            ExecuteSQLResult(bsSQL, ResultObj, tx, resolve, reject, Connect)
        });
    }

    console.log(process.cwd());

    log4js.configure(process.cwd() + '/logs/log4js.json');
    var logger = log4js.getLogger('DEBUG_commondb::');
    logger.setLevel('INFO');
    EWTRACE = function (Message) {
        var myDate = new Date();
        var nowStr = myDate.format("yyyyMMdd hh:mm:ss");
        logger.info(Message + "\r");
    }

    //接受参数
    EWTRACEIFY = function (Message) {
        var myDate = new Date();
        var nowStr = myDate.format("yyyyMMdd hh:mm:ss");
        // logger.warn(JSON.stringify(Message) + "\r");
        logger.warn(Message);
    }

    //提醒
    EWTRACETIP = function (Message) {
        logger.warn("Tip:" + JSON.stringify(Message) + "\r");
    }

    //错误
    EWTRACEERROR = function (Message) {
        logger.error(JSON.stringify(Message) + "\r");
    }


    Date.prototype.format = function (format) {
        var o = {
            "M+": this.getMonth() + 1, //month 
            "d+": this.getDate(), //day 
            "h+": this.getHours(), //hour 
            "m+": this.getMinutes(), //minute 
            "s+": this.getSeconds(), //second 
            "q+": Math.floor((this.getMonth() + 3) / 3), //quarter 
            "S": this.getMilliseconds() //millisecond 
        }

        if (/(y+)/.test(format)) {
            format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        }

        for (var k in o) {
            if (new RegExp("(" + k + ")").test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
            }
        }
        return format;
    }

    ExecuteSQLResult = function (SQL, ResultObj, tx, resolve, reject, Connect) {
        try {
            _ExecuteSQL(SQL, tx, Connect, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    if (ResultObj)
                        ResultObj.Result = result;
                    resolve(result);
                }
            })
        } catch (ex) {
            throw ex;
        }
    }


    ExecuteSQL = function (SQL, resolve, reject) {
        try {
            _ExecuteSQL(SQL, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            })
        } catch (ex) {
            throw ex;
        }
    }



    _SendMail = function (tomail, mailsubject, mailcontext) {

        EWTRACE("tomail:" + tomail);
        EWTRACE("mailsubject:" + mailsubject);
        EWTRACE("mailcontext:" + mailcontext);

        require('dotenv').config({ path: './config/.env' });
        var nodemailer = require("nodemailer");
        // 开启一个 SMTP 连接池
        var smtpTransport = nodemailer.createTransport("SMTP", {
            host: "mail.downtown8.com", // 主机
            secureConnection: false, // 使用 SSL
            port: 25, // SMTP 端口
            auth: {
                user: process.env.BusinessMailAddress, // 账号
                pass: process.env.mailpassword // 密码
            }
        });
        // 设置邮件内容
        var mailOptions = {
            from: "<business@downtown8.com>", // 发件地址
            to: tomail, // 收件列表
            subject: mailsubject, // 标题
            html: "<br>" + mailcontext // html 内容
        }
        // 发送邮件
        _SelfSendMail = function (resolve, reject) {
            smtpTransport.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    console.log("Message sent: " + response.message);
                    resolve(null);
                }
                smtpTransport.close(); // 如果没用，关闭连接池
            });
        }
        return new Promise(_SelfSendMail);
    }

    SendSMS = function (mobile, context, type) {

        _SendSMS = function (resolve, reject) {
            var smsService = common.app.dataSources.luosimaoRest;
            if (type == 1) {
                smsService = common.app.dataSources.luosimaoRegCheck;
            }
            smsService.send(mobile, context, 30, function (err, response, context) {
                if (err)
                { reject(err); }

                if (response[0].error) {
                    reject(new Error(response[0].msg));
                } else {
                    resolve(null);
                }
            });
        };
        return new Promise(_SendSMS);
    }

    DelOKPacket = function (result) {
        if (result && _.isArray(result)) {
            var mr = _.find(result, function (item) {
                return item.fieldCount != undefined;
            });
            if (mr) {
                var r = _.find(result, function (item) {
                    return item.fieldCount == undefined;
                });
                if (r) {
                    result = r;
                }
            }
        }
        return result;
    };

    function getYearWeek(date) {
        var date2 = new Date(date.getFullYear(), 0, 1);
        var day1 = date.getDay();
        if (day1 == 0) day1 = 7;
        var day2 = date2.getDay();
        if (day2 == 0) day2 = 7;
        d = Math.round((date.getTime() - date2.getTime() + (day2 - day1) * (24 * 60 * 60 * 1000)) / 86400000);
        return Math.ceil(d / 7) + 1;
    }

    function getWeekNum(date) {
        var DayList = [];

        var i = 1;
        while (i <= 8) {
            if (date.getDay() == 1 || date.getDay() == 3) {
                var strMonth = date.getMonth() + 1;
                if (strMonth < 10)
                { strMonth = "0" + strMonth; }
                var strDay = date.getDate();
                if (strDay < 10)
                { strDay = "0" + strDay }

                DayList.push(date.getFullYear() + "-" + strMonth + "-" + strDay);

                i++;
            }
            date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        }
        return DayList;
    }

    getIPAdress = function () {
        var interfaces = require('os').networkInterfaces();
        for (var devName in interfaces) {
            var iface = interfaces[devName];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                    return alias.address;
                }
            }
        }
    }    

    getWeChatToken = function (userId) {

        var jwt = require('jsonwebtoken');
        var rf = require("fs");
        var cert = rf.readFileSync("jwt_rsa_private_key.pem", "utf-8");

        return new Promise(function (resolve, reject) {
            jwt.sign(userId, cert, { algorithm: 'RS256', expiresIn: '15d' }, function (err, token) {
                if (err) {
                    reject(err);
                } else {
                    resolve(token);
                }
            });
        });

    }

    getJWT = function (userId) {

        var ps = [];
        var _result = { Result: 0 };
        var dataSource_brand = OpRegBrandApi.app.datasources.requestorders;
        var bsSQL = "select brandid from userbrand where userid = " + userId;

        ps.push(ExecuteSyncSQLResult(bsSQL, _result, null, dataSource_brand));

        return Promise.all(ps).then(function () {
            var jwt = require('jsonwebtoken');
            var brandids = [];
            _result.Result.forEach(function (item) {
                brandids.push(item.brandid);
            })

            var rf = require("fs");
            var cert = rf.readFileSync("jwt_rsa_private_key.pem", "utf-8");

            var payload = {
                userId: userId,
                brandIds: brandids,
                iat: Math.floor(Date.now() / 1000)
            };
            return new Promise(function (resolve, reject) {
                jwt.sign(payload, cert, { algorithm: 'RS256', expiresIn: '1d' }, function (err, token) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(token);
                    }
                });
            });
        })
    }


    GetOpenIDFromToken = function (token) {
        var jwt = require('jwt-simple');
        var rf = require("fs");
        var secret = rf.readFileSync("jwt_rsa_public_key.pem", "utf-8");

        var decoded = null;

        try {
            decoded = jwt.decode(token, secret);
            EWTRACEIFY(decoded);
            return decoded;
        } catch (err) {
            throw (err);
        }
    }


};    