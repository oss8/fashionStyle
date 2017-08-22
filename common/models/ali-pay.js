
module.exports = function (AliPay) {
    var app = require('../../server/server');
    app.DisableSystemMethod(AliPay);

    var uuid = require('node-uuid');

    require('dotenv').config({ path: './config/.env' });
    var appid = process.env.aliAppID;

    
    AliPay.Ali_Pay = function (payInfo) {
        console.log("Ali_Pay Begin");
        return new Promise(function (resolve, reject) {
            const fs = require('fs');
            const path = require('path');
            const Alipay = require('alipay2');

            const alipay = new Alipay({
                notify_url: process.env.wxNotifyURL + "AliPays/alnotify",
                appId: appid,
                signType: 'RSA',
                appKey: fs.readFileSync(path.join(__dirname, '../../config/privateKey.pub')),
                alipayPublicKey: fs.readFileSync(path.join(__dirname, '../../config/publicKey.pub')),
                charset : 'utf-8',
                sign_type  : 'RSA'
            });
            payInfo.out_trade_no = uuid.v4();

            var _fee = payInfo.fee;
            _fee = 0.01;

            alipay.precreate({
                subject: '杭州人马座科技有限公司'
                , out_trade_no: payInfo.out_trade_no
                , total_amount: _fee
                , timeout_express: '10m'
            }).then(function (res) {
                console.log(res);
                res.out_trade_no = payInfo.out_trade_no;
                res.app_id = appid;

                resolve(res);
            }).catch(function (err) {
                console.log(err);
                reject(err);
            });
        });
    }

    AliPay.remoteMethod(
        'Ali_Pay',
        {
            http: { verb: 'post' },
            description: '支付宝支付预下单',
            accepts: { arg: 'fee', type: 'string', description: '{"fee":"",' },
            returns: { arg: 'RegionInfo', type: 'object', root: true }
        }
    );

    AliPay.alnotify = function (a, cb) {
        console.log(a);
        var oo = {};
        oo.ordersId = a.out_trade_no;
        oo.trade_status = a.trade_status;
        oo.map = a;
        oo.payType = "alipayWeb";

        var param = JSON.stringify(oo);
        var status = "fail";

        // console.log(a.trade_status);
        if (oo.trade_status == "TRADE_SUCCESS") {

            status = "success";

            var bsSQL = "update cd_TstyleOrders set status = 'commit' where payid = '" + oo.ordersId + "'";

            DoSQL(bsSQL).then(function () {
                cb(null, status, 'text/plain; charset=utf-8');
            }, function (err) {
                cb(null, status, 'text/plain; charset=utf-8');
            })

        }
        
    }

    AliPay.remoteMethod(
        'alnotify',
        {
            accepts: [
                {
                    arg: 'a', type: 'object',
                    http: function (ctx) {
                        var req = ctx.req;
                        return req.body;
                    }
                }
            ],
            returns: [{ arg: 'body', type: 'file', root: true }, { arg: 'Content-Type', type: 'string', http: { target: 'header' } }],
            http: { verb: 'post' }
        }
    );
};
