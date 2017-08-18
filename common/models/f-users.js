'use strict';

module.exports = function (Fusers) {

    var app = require('../../server/server');
    app.DisableSystemMethod(Fusers);
    var _ = require('underscore');

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

        try{
            var _info = GetOpenIDFromToken(token);
            var bsSQL = "select id,mobile,name,lastLogintime,password,headImage from cd_users where mobile = '" + _info.mobile + "' and password = '" + _info.password + "'";
            DoSQL(bsSQL).then(function (UserInfo) {
    
                getWeChatToken(UserInfo[0]).then(function (resultToken) {
                    var _result = {};
                    _result.UserInfo = UserInfo[0];
                    _result.token = resultToken;
    
                    cb(null, { status: 1, "result": _result });
                });
            }, function (err) {
                cb(null, { status: 0, "result": "" });
            });
        }
        catch(err){
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


    Fusers.userLogin = function (userInfo, cb) {
        EWTRACE("userLogin Begin");

        var pv = [];
        var UserInfo = { Result: 0 };
        var bsSQL = "";

        if (!_.isUndefined(userInfo.mobile)) {
            bsSQL = "select id,mobile,name,lastLogintime,password,headImage from cd_users where mobile = '" + userInfo.mobile + "' and password = '" + userInfo.password + "'";
            pv.push(ExecuteSyncSQLResult(bsSQL, UserInfo));

            var UserAddress = {};
            bsSQL = "select id,address,isdefault from cd_useraddress where id in (select id from cd_users where mobile = '" + userInfo.mobile + "' and password = '" + userInfo.password + "')";
            pv.push(ExecuteSyncSQLResult(bsSQL, UserAddress));
        }
        else {
            bsSQL = "select id,mobile,name,lastLogintime,password,headImage from cd_users where openid = '" + userInfo.openId + "'";
            pv.push(ExecuteSyncSQLResult(bsSQL, UserInfo));

            var UserAddress = {};
            bsSQL = "select id,address,isdefault from cd_useraddress where id in (select id from cd_users where openid = '" + userInfo.openId + "')";
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
                bsSQL += "select id,mobile,name,lastLogintime,password,headImage from cd_users where openid = '" + userInfo.openId + "';";
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
            _openid = OpenID.id;
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
        bsSQL += "lastLogintime = now() where id = " + _openid;

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


            bsSQL = "update cd_TstyleOrders set address ='" + orderInfo.address + "', zipcode = '" + orderInfo.zipCode + "',paytype = '"+orderInfo.payType+"', status = 'payment' where id = " + orderInfo.orderId;

            DoSQL(bsSQL).then(function () {
                cb(null, { status: 1, "result": "" });
            }, function (err) {
                cb(err, { status: 0, "result": "" });
            });
            EWTRACE("saveOrders End");

    };

    Fusers.remoteMethod(
        'paymentOrders',
        {
            http: { verb: 'post' },
            description: '支付单据',
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', description: '{"orderId":"","address":"","zipCode":"","payType":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.saveOrders = function (orderInfo, cb) {
        EWTRACE("saveOrders Begin");

        var pv = [];
        var BaseTypeInfo = { Result: 0 };
        var bsSQL = "select baseId, baseName,fee from cd_baseversion where baseId = '" + orderInfo.baseId + "'";
        pv.push(ExecuteSyncSQLResult(bsSQL, BaseTypeInfo));

        var UserInfo = { Result: 0 };
        bsSQL = "select id,name from cd_users where id = '" + orderInfo.userId + "'";
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

            bsSQL = "insert into cd_TstyleOrders(userId,gender,baseId,baseName,stylecontext,adddate,title,height,color,orderType,praise,size,address,zipcode,finishImage,status,fee) values('" + orderInfo.userId + "','" + orderInfo.gender + "','" + orderInfo.baseId + "','" + BaseTypeInfo.Result[0].baseName + "','" + new Buffer(orderInfo.styleContext).toString('base64') +"',now(),'" + title + "','" + orderInfo.height + "','" + orderInfo.color + "','" + orderInfo.orderType + "',0,'" + orderInfo.height + "','" + orderInfo.address + "','" + orderInfo.zipCode + "','" + orderInfo.finishImage + "','new',"+BaseTypeInfo.Result[0].fee+");";

            bsSQL += "select id as orderId,fee from cd_TstyleOrders where id = LAST_INSERT_ID() order by id desc limit 1;";

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
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', description: '{"userId":"","gender":"","baseId":"","styleContext":"","height":170,"color":"#FFFFFF","orderType":"Check/Share","size":"","address":"","zipCode":"","finishImage":""}' },
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

    Fusers.requestOrders = function (orderInfo, cb) {
        EWTRACE("requestOrders Begin");

        var bsSQL = "select id,userId,Gender,baseId,styleContext as Context,addDate,baseName,title,praise,height,color,orderType,size,address,zipcode from cd_tstyleorders where userid = '" + orderInfo.userid + "' order by adddate desc;";

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
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"userId":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.requestOrdersFromOrderId = function (orderInfo, cb) {
        EWTRACE("requestOrdersFromOrderId Begin");

        var bsSQL = "select id,userId,Gender,baseId,styleContext as Context,addDate,baseName,title,praise,height,color,orderType,size,address,zipcode from cd_tstyleorders where id = '" + orderInfo.userid + "'";

        DoSQL(bsSQL).then(function (result) {
            result.forEach(function (item) {
                item.styleContext = Buffer(item.Context, 'base64').toString();

            })
            cb(null, { status: 1, "result": result });
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

    Fusers.requestOrdersFromsquare = function (orderInfo, cb) {
        EWTRACE("requestOrdersFromsquare Begin");

        var bsSQL = "select id,userId,Gender,baseId,styleContext as Context,addDate,baseName,title,praise,height,color,orderType,size,address,zipcode from cd_tstyleorders order by praise desc limit 10;";

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
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"id":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.requestSquareDesign = function (orderInfo, cb) {
        EWTRACE("requestOrdersFromDesign Begin");

        var begin = (orderInfo.pageIndex - 1) * 10 + 1;

        var bsSQL = "select a.id,a.mobile,a.name,a.headimage from cd_users a, (select userid from cd_tstyleorders order by praise desc limit 10) t where a.id = t.userid limit " + begin + ",10";

        DoSQL(bsSQL).then(function (result) {
            cb(null, { status: 1, "result": result });
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
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"pageIndex":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.requestDesignOrders = function (orderInfo, cb) {
        EWTRACE("requestDesignOrders Begin");


        var pv = [];
        var praiseList = { Result: 0 };
        var bsSQL = "select id,userId,Gender,baseId,styleContext as Context,addDate,baseName,title,praise,height,color,orderType,size,address,zipcode from cd_tstyleorders where id = '" + orderInfo.userId + "' order by praise desc limit 5;";
        pv.push(ExecuteSyncSQLResult(bsSQL, praiseList));

        var newList = { Result: 0 };
        bsSQL = "select id,userId,Gender,baseId,styleContext as Context,addDate,baseName,title,praise,height,color,orderType,size from cd_tstyleorders where id = '" + orderInfo.userId + "' order by adddate desc limit 5;";
        pv.push(ExecuteSyncSQLResult(bsSQL, newList));

        Promise.all(pv).then(function () {

            var _result = _.union(praiseList.Result, newList.Result);

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
            accepts: { arg: 'orderInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"userId":""}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );

    Fusers.addUseraddress = function (userInfo, cb) {
        EWTRACE("addUseraddress Begin");

        var pv = [];
        var UserInfo = { Result: 0 };
        var bsSQL = "select id,name from cd_users where id = '" + orderInfo.userId + "'";
        pv.push(ExecuteSyncSQLResult(bsSQL, UserInfo));

        Promise.all(pv).then(function () {

            if (UserInfo.Result.length == 0) {
                cb(new Error('用户未找到'), { status: 0, "result": "" });
                return;
            }

            bsSQL = "";

            var isDefault = 0;
            if (UserInfo.isDefault) {
                isDefault = 1;
                bsSQL = "update cd_userAddress set isDefault = 0 where id = '" + UserInfo.userId + "';";
            }

            bsSQL += "insert into cd_userAddress(id,address,isDefault) values('" + UserInfo.userId + "','" + UserInfo.address + "'," + isDefault + ")";

            DoSQL(bsSQL).then(function () {
                cb(null, { status: 1, "result": "" });
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
        'addUseraddress',
        {
            http: { verb: 'post' },
            description: '保存用户收货地址',
            accepts: { arg: 'userInfo', http: { source: 'body' }, type: 'object', root: true, description: '{"userId":"","address":"","isDefault":"true"}' },
            returns: { arg: 'userInfo', type: 'object', root: true }
        }
    );
};
