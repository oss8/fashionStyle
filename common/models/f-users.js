'use strict';

module.exports = function (Fusers) {

    var app = require('../../server/server');
    app.DisableSystemMethod(Fusers);
    var _ = require('underscore');
    var qiniu = require('qiniu');

    Fusers.sendRegCode = function (userInfo, cb) {
        EWTRACE("sendRegCode Begin");

        var pv = [];
        var Random = { Result: 0 };
        var bsSQL = "select usp_NewRandomNumber(4) as Random_Number";
        pv.push(ExecuteSyncSQLResult(bsSQL, Random));

        var UserInfo = { Result: 0 };
        var bsSQL = "select * from cd_users where mobile = '" + userInfo.mobile + "'";
        pv.push(ExecuteSyncSQLResult(bsSQL, UserInfo));


        Promise.all(pv).then(function () {

            var smspv = SendSMS(userInfo.mobile, Random.Result[0].Random_Number);
            smspv.then(function () {

                if (UserInfo.Result.length == 0) {
                    bsSQL = "insert into cd_users(mobile,password) values('" + userInfo.mobile + "','" + Random.Result[0].Random_Number + "');"
                } else {
                    bsSQL = "update cd_users set password = '" + Random.Result[0].Random_Number + "' where mobile = '" + userInfo.mobile + "';"
                }
                DoSQL(bsSQL).then(function () {
                    cb(null, { status: 1, "result": "" });
                }, function (err) {
                    cb(null, { status: 0, "result": err.message });
                })

                EWTRACE("sendRegCode End");
            }, function (err) {
                cb(null, { status: 0, "result": err.message });
                EWTRACE("sendRegCode End");
                return;
            });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    };

    Fusers.remoteMethod(
        'sendRegCode',
        {
            http: { verb: 'post' },
            description: '发送认证码',
            accepts: { arg: 'userInfo', type: 'object', http: { source: 'body' }, description: '{"mobile":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.GetUserInfo = function (token, cb) {
        EWTRACE("GetUserInfo Begin");

        try {


            var _info = {};
            try {
                _info = GetOpenIDFromToken(token);
            } catch (err) {
                cb(err, { status: 0, "result": "" });
                return;
            }

            var bsSQL = "select userid,mobile,name,lastLogintime,password,headImage from cd_users where userid = '"+_info.userid+"'";
            DoSQL(bsSQL).then(function (UserInfo) {

                getWeChatToken(UserInfo[0]).then(function (resultToken) {
                    var _result = {};
                    _result.UserInfo = UserInfo[0];
                    _result.token = resultToken;

                    cb(null, { status: 1, "result": _result });
                });
            }, function (err) {
                cb(err, { status: 0, "result": "" });
            });
        }
        catch (err) {
            cb(null, { status: 0, "result": "" });
        }

    }

    Fusers.remoteMethod(
        'GetUserInfo',
        {
            http: { verb: 'post' },
            description: '发送认证码',
            accepts: {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.GetQinniuToken = function (token, cb) {
        EWTRACE("GetQinniuToken Begin");

        try {
            var _info = GetOpenIDFromToken(token);
            var bsSQL = "select userid,mobile,name,lastLogintime,password,headImage from cd_users where userid = '"+_info.userid+"'";
            DoSQL(bsSQL).then(function (UserInfo) {
                if (UserInfo.length == 0) {
                    cb(null, { status: 0, "result": "" });
                    return;
                }
                require('dotenv').config({ path: './config/.env' });
                var accessKey = process.env.qiniuAccessKey;
                var secretKey = process.env.qiniuSecretKey;
                var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
                var options = {
                    scope: 'tstyle',
                };
                var putPolicy = new qiniu.rs.PutPolicy(options);
                var uploadToken = putPolicy.uploadToken(mac);

                cb(null, { status: 1, "result": uploadToken });

            }, function (err) {
                cb(null, { status: 0, "result": "" });
            });
        }
        catch (err) {
            cb(null, { status: 0, "result": "" });
        }

    }

    Fusers.remoteMethod(
        'GetQinniuToken',
        {
            http: { verb: 'post' },
            description: '发送认证码',
            accepts: {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );


    Fusers.userLogin = function (userInfo, cb) {
        EWTRACE("userLogin Begin");

        var pv = [];
        var UserInfo = { Result: 0 };
        var bsSQL = "";

        if (!_.isUndefined(userInfo.mobile)) {
            bsSQL = "select userid,mobile,name,lastLogintime,password,headImage from cd_users where mobile = '" + userInfo.mobile + "' and password = '" + userInfo.password + "'";
            pv.push(ExecuteSyncSQLResult(bsSQL, UserInfo));

            var UserAddress = {};
            bsSQL = "select id,userid,address,isdefault,userName,mobile,city,zipcode from cd_useraddress where userid in (select userid from cd_users where mobile = '" + userInfo.mobile + "' and password = '" + userInfo.password + "')";
            pv.push(ExecuteSyncSQLResult(bsSQL, UserAddress));
        }
        else {
            bsSQL = "select userid,mobile,name,lastLogintime,password,headImage from cd_users where openid = '" + userInfo.openId + "'";
            pv.push(ExecuteSyncSQLResult(bsSQL, UserInfo));

            var UserAddress = {};
            bsSQL = "select id,userid,address,isdefault,userName,mobile,city,zipcode from cd_useraddress where userid in (select userid from cd_users where openid = '" + userInfo.openId + "')";
            pv.push(ExecuteSyncSQLResult(bsSQL, UserAddress));
        }

        Promise.all(pv).then(function () {

            if (UserInfo.Result.length == 0 && !_.isUndefined(userInfo.mobile)) {
                cb(new Error('用户未注册或密码错误'), { status: 0, "result": "" });
                return;
            }

            if (!_.isUndefined(userInfo.mobile)) {
                bsSQL = "update cd_users set lastLogintime = now() where mobile = '" + userInfo.mobile + "' and password = '" + userInfo.password + "'";
                DoSQL(bsSQL).then(function () {

                    UserInfo.Result[0].isNew = false;
                    if (_.isNull(UserInfo.Result[0].lastLogintime)) {
                        UserInfo.Result[0].isNew = true;
                    }

                    getWeChatToken(UserInfo.Result[0]).then(function (resultToken) {
                        var _result = {};
                        _result.UserInfo = UserInfo.Result[0];
                        _result.address = [];
                        _result.token = resultToken;

                        cb(null, { status: 1, "result": _result });
                    });

                }, function (err) {
                    cb(err, { status: 0, "result": "" });
                })
            }
            else {
                bsSQL = "";
                var isNew = false;
                if (UserInfo.Result.length == 0) {
                    bsSQL += "insert into cd_users(openid,lastLogintime) values('" + userInfo.openId + "',now());";
                    isNew = true;
                }
                bsSQL += "select userid,mobile,name,lastLogintime,password,headImage from cd_users where openid = '" + userInfo.openId + "';";
                bsSQL += "update cd_users set lastLogintime = now() where openid = '" + userInfo.openId + "';";
                DoSQL(bsSQL).then(function (result) {

                    result[0].isNew = isNew;

                    getWeChatToken(result[0]).then(function (resultToken) {
                        var _result = {};
                        _result.UserInfo = result[0];
                        _result.address = UserAddress.Result;
                        _result.token = resultToken;
                        cb(null, { status: 1, "result": _result });
                    });



                }, function (err) {
                    cb(err, { status: 0, "result": "" });
                });
            }
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    };

    Fusers.remoteMethod(
        'userLogin',
        {
            http: { verb: 'post' },
            description: '用户注册',
            accepts: { arg: 'userInfo', type: 'object', http: { source: 'body' }, description: '{"mobile":"","password":"","openId":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.userModify = function (userInfo, token, cb) {
        EWTRACE("userModify Begin");


        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.userid;
        } catch (err) {
            cb(null, { status: 403, "result": "" });
            return;
        }


        var bsSQL = "update cd_users set ";
        if (!_.isUndefined(userInfo.mobile)) {
            bsSQL += " mobile = '" + userInfo.mobile + "',";
        }
        if (!_.isUndefined(userInfo.headimage)) {
            bsSQL += " headimage = '" + userInfo.headimage + "',";
        }
        if (!_.isUndefined(userInfo.name)) {
            bsSQL += " name = '" + userInfo.name + "',";
        }
        bsSQL += "lastLogintime = now() where userid = " + _openid;

        DoSQL(bsSQL).then(function (result) {

            cb(null, { status: 1, "result": "" });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    };

    Fusers.remoteMethod(
        'userModify',
        {
            http: { verb: 'post' },
            description: '用户修改信息',
            accepts: [{
                arg: 'UserInfo', type: 'object',
                http: { source: 'body' },
                description: '{"mobile":"15868177542","headimage":"https://mp.weixin.qq.com/cgi-bin/settingpage?t=setting/index&action=index&token=1346104615&lang=zh_CN","name":"朱哥"}'
            }, {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }],
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );



    Fusers.paymentOrders = function (orderInfo, cb) {
        EWTRACE("paymentOrders Begin");

        var payInfo = {};
        payInfo.fee = orderInfo.fee;


        if (orderInfo.payType == 'aliPay') {

            app.models.AliPay.Ali_Pay(payInfo).then(function (payResult) {

                var bsSQL = "update cd_TstyleOrders set address ='" + orderInfo.address + "', zipcode = '" + orderInfo.zipCode + "',paytype = '" + orderInfo.payType + "', status = 'payment',payId = '" + payResult.out_trade_no + "' where id = " + orderInfo.orderId;

                DoSQL(bsSQL).then(function () {
                    cb(null, { status: 1, "result": payResult });
                }, function (err) {
                    cb(err, { status: 0, "result": "" });
                })
            });
        }
        else {

            app.models.Wxpay.wxPayment(payInfo).then(function (payResult) {
                var bsSQL = "update cd_TstyleOrders set address ='" + orderInfo.address + "', zipcode = '" + orderInfo.zipCode + "',paytype = '" + orderInfo.payType + "', status = 'payment',payId = '" + payResult.out_trade_no + "' where id = " + orderInfo.orderId;

                DoSQL(bsSQL).then(function () {

                    cb(null, { status: 1, "result": payResult });
                }, function (err) {
                    cb(err, { status: 0, "result": "" });
                })
            }, function (err) {
                cb(err, { status: 0, "result": "" });
            })
        }

        EWTRACE("saveOrders End");

    };



    Fusers.remoteMethod(
        'paymentOrders',
        {
            http: { verb: 'post' },
            description: '支付单据',
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', description: '{"orderId":"","address":"","zipCode":"","payType":"","fee":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.getPayStatus = function (orderInfo, cb) {
        EWTRACE("getPayStatus Begin");


        var bsSQL = "select status from cd_TstyleOrders where payid = '" + orderInfo.paymentId + "'";

        DoSQL(bsSQL).then(function (result) {
            if ( result.length > 0 ){
                cb(null, { status: 1, "result": result });
            }
            else{
                cb(new Error('未找到对应订单'), { status: 1, "result": "" });
            }
            
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        })


        EWTRACE("getPayStatus End");

    };

    Fusers.remoteMethod(
        'getPayStatus',
        {
            http: { verb: 'post' },
            description: '获得单据支付状态',
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', description: '{"paymentId":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.saveOrders = function (orderInfo, token, cb) {
        EWTRACE("saveOrders Begin");

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.userid;
        } catch (err) {
            cb(null, { status: 403, "result": "" });
            return;
        }

        var pv = [];
        var BaseTypeInfo = { Result: 0 };
        var bsSQL = "select baseId, baseName,fee from cd_baseversion where baseId = '" + orderInfo.baseId + "'";
        pv.push(ExecuteSyncSQLResult(bsSQL, BaseTypeInfo));

        var UserInfo = { Result: 0 };
        bsSQL = "select userid,name from cd_users where userid = '" + _openid + "'";
        pv.push(ExecuteSyncSQLResult(bsSQL, UserInfo));

        Promise.all(pv).then(function () {

            if (BaseTypeInfo.Result.length == 0) {
                cb(new Error('基础版型未找到'), { status: 0, "result": "" });
                return;
            }
            if (UserInfo.Result.length == 0) {
                cb(new Error('用户未找到'), { status: 0, "result": "" });
                return;
            }

            var title = UserInfo.Result[0].name + '设计的' + BaseTypeInfo.Result[0].baseName + '(' + new Date().format("yyyy-MM-dd") + ")";

            bsSQL = "insert into cd_TstyleOrders(userId,gender,baseId,baseName,stylecontext,adddate,title,height,color,orderType,praise,size,address,zipcode,finishImage,status,fee) values('" + _openid + "','" + orderInfo.gender + "','" + orderInfo.baseId + "','" + BaseTypeInfo.Result[0].baseName + "','" + new Buffer(orderInfo.styleContext).toString('base64') + "',now(),'" + title + "','" + orderInfo.height + "','" + orderInfo.color + "','" + orderInfo.orderType + "',0,'" + orderInfo.height + "','" + orderInfo.address + "','" + orderInfo.zipCode + "','" + orderInfo.finishImage + "','new'," + BaseTypeInfo.Result[0].fee + ");";

            bsSQL += "select id as orderId,fee,orderType from cd_TstyleOrders where id = LAST_INSERT_ID() order by id desc limit 1;";

            DoSQL(bsSQL).then(function (result) {

                cb(null, { status: 1, "result": result[0] });
            }, function (err) {
                cb(err, { status: 0, "result": "" });
            });
            EWTRACE("saveOrders End");
        }, function (err) {
            cb(err, { status: 0, "result": "" });
            EWTRACE("saveOrders End");
        });
    };

    Fusers.remoteMethod(
        'saveOrders',
        {
            http: { verb: 'post' },
            description: '保存用户设计',
            accepts: [{ arg: 'orderInfo', http: { source: 'body' }, type: 'object', description: '{"gender":"","baseId":"","styleContext":"","height":170,"color":"#FFFFFF","orderType":"Check/Share","size":"","address":"","zipCode":"","finishImage":""}' }, {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }],
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );





    Fusers.OrderPraise = function (orderInfo, cb) {
        EWTRACE("OrderPraise Begin");

        var bsSQL = "update cd_tstyleorders set Praise = Praise + 1 where id = '" + orderInfo.orderId + "'";

        DoSQL(bsSQL).then(function () {
            cb(null, { status: 1, "result": "" });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
        EWTRACE("OrderPraise End");

    };

    Fusers.remoteMethod(
        'OrderPraise',
        {
            http: { verb: 'post' },
            description: '点赞',
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"orderId":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.requestOrders = function (orderInfo, token, cb) {
        EWTRACE("requestOrders Begin");

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.userid;
        } catch (err) {
            cb(null, { status: 403, "result": "" });
            return;
        }

        var bsSQL = "select id,userId,Gender,baseId,styleContext as Context,addDate,baseName,title,praise,height,color,orderType,size,address,zipcode,finishimage,fee from cd_tstyleorders where userid = '" + _openid + "' order by adddate desc limit " + orderInfo.pageIndex * 10 + ",10";

        DoSQL(bsSQL).then(function (result) {
            result.forEach(function (item) {
                item.styleContext = Buffer(item.Context, 'base64').toString();

            })

            cb(null, { status: 1, "result": result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
        EWTRACE("requestOrders End");

    };

    Fusers.remoteMethod(
        'requestOrders',
        {
            http: { verb: 'post' },
            description: '查询用户订单',
            accepts: [{ arg: 'orderInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"pageIndex":""}' },{
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }],
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.requestOrdersFromOrderId = function (orderInfo, cb) {
        EWTRACE("requestOrdersFromOrderId Begin");

        var bsSQL = "select id,userId,Gender,baseId,styleContext as Context,addDate,baseName,title,praise,height,color,orderType,size,address,zipcode,finishimage,fee from cd_tstyleorders where id = '" + orderInfo.id + "'";

        DoSQL(bsSQL).then(function (result) {
            if (result && result.length > 0) {
                result.forEach(function (item) {
                    item.styleContext = Buffer(item.Context, 'base64').toString();
                })
                cb(null, { status: 1, "result": result[0] });
            } else {
                cb(null, { status: 0, "result": "未找到此订单" });
            }

        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
        EWTRACE("requestOrdersFromOrderId End");

    };

    Fusers.remoteMethod(
        'requestOrdersFromOrderId',
        {
            http: { verb: 'post' },
            description: '根据单号查询单据',
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"id":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.requestOrdersFromsquare = function (cb) {
        EWTRACE("requestOrdersFromsquare Begin");

        var bsSQL = "select id,userId,Gender,baseId,styleContext as Context,addDate,baseName,title,praise,height,color,orderType,size,address,zipcode,finishimage,fee from cd_tstyleorders order by praise desc limit 10;";

        DoSQL(bsSQL).then(function (result) {
            result.forEach(function (item) {
                item.styleContext = Buffer(item.Context, 'base64').toString();

            })
            cb(null, { status: 1, "result": result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
        EWTRACE("requestOrdersFromsquare End");
    };

    Fusers.remoteMethod(
        'requestOrdersFromsquare',
        {
            http: { verb: 'post' },
            description: '查询排名前10单据',
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.requestSquareDesign = function (orderInfo, cb) {
        EWTRACE("requestOrdersFromDesign Begin");

        var pv = [];
        var newList = { Result: 0 };
        var bsSQL = "select a.userid,a.mobile,a.name,a.headimage from cd_users a, (select distinct userid from cd_tstyleorders order by praise desc limit 10) t where a.userid = t.userid limit " + orderInfo.pageIndex * 10 + ",10";
        pv.push(ExecuteSyncSQLResult(bsSQL, newList));

        var countList = { Result: 0 };
        bsSQL = "select userid,count(*) as counts from cd_tstyleorders group by userid";
        pv.push(ExecuteSyncSQLResult(bsSQL, countList));
        Promise.all(pv).then(function () {

            newList.Result.forEach(function(item){
                var find = _.find(countList.Result, function(fitem){
                    return fitem.userid == item.userid;
                })

                if ( _.isUndefined(find)){
                    item.counts =  0;
                }                
                else{
                    item.counts = find.counts;
                }
            })


            cb(null, { status: 1, "result": newList.Result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
        EWTRACE("requestSquareDesign End");
    };

    Fusers.remoteMethod(
        'requestSquareDesign',
        {
            http: { verb: 'post' },
            description: '查询设计师排名',
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"pageIndex":0}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.requestDesignOrders = function (orderInfo, cb) {
        EWTRACE("requestDesignOrders Begin");

        var pv = [];
        var newList = { Result: 0 };
        var bsSQL = "select id,userId,Gender,baseId,styleContext as Context,addDate,baseName,title,praise,height,color,orderType,size,finishimage,fee from cd_tstyleorders where userid = '" + orderInfo.desginUserId + "' order by adddate desc limit " + orderInfo.pageIndex * 10 + ",10;";
        pv.push(ExecuteSyncSQLResult(bsSQL, newList));

        Promise.all(pv).then(function () {

            var _result = newList.Result;

            _result.forEach(function (item) {
                item.styleContext = Buffer(item.Context, 'base64').toString();

            })
            cb(null, { status: 1, "result": _result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
        EWTRACE("requestDesignOrders End");
    };

    Fusers.remoteMethod(
        'requestDesignOrders',
        {
            http: { verb: 'post' },
            description: '查询设计师订单',
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"desginUserId":"","pageIndex":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.addUseraddress = function (userInfo, token, cb) {
        EWTRACE("addUseraddress Begin");

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.userid;
        } catch (err) {
            cb(null, { status: 403, "result": "" });
            return;
        }

        var pv = [];
        var UserInfo = { Result: 0 };
        var bsSQL = "select userid,name from cd_users where userid = '" + _openid + "'";
        pv.push(ExecuteSyncSQLResult(bsSQL, UserInfo));


        addressInfo = { Result: 0 };
        var bsSQL = "select * from cd_userAdddress where userid = '" + _openid + "'";
        pv.push(ExecuteSyncSQLResult(bsSQL, addressInfo));        
        Promise.all(pv).then(function () {

            if (UserInfo.Result.length == 0) {
                cb(new Error('用户未找到'), { status: 0, "result": "" });
                return;
            }

            bsSQL = "";

            var isDefault = 0;
            if (!_.isUndefined(userInfo.isDefault) && userInfo.isDefault) {
                isDefault = 1;
            }

            if ( addressInfo.length == 0 ){
                isDefault = 1;
            }

            if (_.isUndefined(userInfo.id)) {
                bsSQL = "insert into cd_userAddress(userid,address,isDefault,userName,mobile,city,zipcode ) values('" + _openid + "','" + userInfo.address + "'," + isDefault + ",'" + userInfo.userName + "','" + userInfo.mobile + "','" + userInfo.city + "','" + userInfo.zipcode + "')";
            }
            else {
                bsSQL = "update cd_userAddress set ";
                var fields = "";
                if (!_.isUndefined(userInfo.address)) {
                    fields += " address = '" + userInfo.address + "',";
                }
                if (!_.isUndefined(userInfo.userName)) {
                    fields += " userName = '" + userInfo.userName + "',";
                }
                if (!_.isUndefined(userInfo.mobile)) {
                    fields += " mobile = '" + userInfo.mobile + "',";
                }
                if (!_.isUndefined(userInfo.city)) {
                    fields += " city = '" + userInfo.city + "',";
                }
                if (!_.isUndefined(userInfo.zipcode)) {
                    fields += " zipcode = '" + userInfo.zipcode + "',";
                }
                fields = fields.substr(0, fields.length - 1);
                bsSQL += fields + " where id= " + userInfo.id;
            }

            DoSQL(bsSQL).then(function () {
                cb(null, { status: 1, "result": "" });
            }, function (err) {
                cb(err, { status: 0, "result": "" });
            });
            EWTRACE("addUseraddress End");
        }, function (err) {
            cb(err, { status: 0, "result": "" });
            EWTRACE("addUseraddress End");
        });
    };

    Fusers.remoteMethod(
        'addUseraddress',
        {
            http: { verb: 'post' },
            description: '保存用户收货地址',
            accepts: [{ arg: 'userInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"id":"","address":"","isDefault":"true","userName","","mobile":"","city":"","zipcode":""}' }, {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }],
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.setDefaultAddress = function (userInfo, token, cb) {
        EWTRACE("setDefaultAddress Begin");

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.userid;
        } catch (err) {
            cb(null, { status: 403, "result": "" });
            return;
        }

        var bsSQL = "update cd_userAddress set isDefault=0 where userid = " + _openid + ";update cd_userAddress set isDefault=1 where id = " + userInfo.id;

        DoSQL(bsSQL).then(function () {
            cb(null, { status: 1, "result": "" });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
        EWTRACE("addUseraddress End");

    };

    Fusers.remoteMethod(
        'setDefaultAddress',
        {
            http: { verb: 'post' },
            description: '设置用户缺省收货地址',
            accepts: [{ arg: 'userInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"id":""}' }, {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }],
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.requestUserAddress = function ( token, cb) {
        EWTRACE("requestUserAddress Begin");

        var _openid = null;
        var OpenID = {};
        try {
            OpenID = GetOpenIDFromToken(token);
            _openid = OpenID.userid;
        } catch (err) {
            cb(null, { status: 403, "result": "" });
            return;
        }

        var bsSQL = "select * from cd_userAddress where userid = '" + _openid + "'";

        DoSQL(bsSQL).then(function (result) {
            cb(null, { status: 1, "result": result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
        EWTRACE("addUseraddress End");

    };

    Fusers.remoteMethod(
        'requestUserAddress',
        {
            http: { verb: 'post' },
            description: '查询用户收获地址',
            accepts: [ {
                arg: 'token', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    return req.headers.token;
                },
                description: '{"token":""}'
            }],
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );    
};
