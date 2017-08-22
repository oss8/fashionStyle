
module.exports = function (Wxpay) {

    var app = require('../../server/server');
    app.DisableSystemMethod(Wxpay);

    require('dotenv').config({ path: './config/.env' });

    var _ = require('underscore');
    var uuid = require('node-uuid');

    var appid = process.env.wxAppID;
    var mch_id = process.env.wxMchID;
    var key = process.env.wxPartnerkey;


    function raw(args) {
        var keys = Object.keys(args);
        keys = keys.sort()
        var newArgs = {};
        keys.forEach(function (key) {
            newArgs[key] = args[key];
        });
        var string = '';
        for (var k in newArgs) {
            string += '&' + k + '=' + newArgs[k];
        }
        string = string.substr(1);
        return string;
    }

    function paysignjs(appid, nonceStr, packages, mch_id, timeStamp, prepay_id) {
        var ret = {
            appid: appid,
            noncestr: nonceStr,
            package: packages,
            partnerid: mch_id,
            timestamp: timeStamp,
            prepayid: prepay_id
        };
        var string = raw(ret);

        var crypto = require('crypto');
        string = string + '&key=' + key;
        var sign = crypto.createHash('md5').update(string, 'utf8').digest('hex');
        return sign.toUpperCase();
    }

    function createTimeStamp() {
        return parseInt(new Date().getTime() / 1000) + '';
    }

    function createNonceStr() {
        return Math.random().toString(36).substr(2, 15);
    }


    Wxpay.wxPayment = function (payInfo) {
        EWTRACE("wxPayment Begin");
        return new Promise(function (resolve, reject) {
            var WXPay = require('weixin-pay');

            var wxpay = WXPay({
                appid: appid,
                mch_id: mch_id,
                partner_key: key, //微信商户平台API密钥
                pfx: '' //微信商户平台证书
            });

            var _out_trade_no = uuid.v4().replace(/-/g, "");

            var _fee = payInfo.fee * 100;
            
            _fee = '1';

            wxpay.createUnifiedOrder({
                body: '杭州人马座科技有限公司',
                out_trade_no: _out_trade_no,
                total_fee: _fee,
                spbill_create_ip: getIPAdress(),
                notify_url: process.env.wxNotifyURL + 'Wxpays/wxnotify',
                trade_type: 'NATIVE',
                product_id: '1234567890'
            }, function (err, result) {

                if (err) {
                    console.log(err.message);
                    reject(err);
                } else {

                    var nonce_str = createNonceStr();
                    var timeStamp = createTimeStamp();
                    var prepay_id = result.prepay_id;

                    //微信支付生成二维码，在此处返回
                    //resolve(result);

                    //生成移动端app调用签名  
                    var _paySignjs = paysignjs(appid, nonce_str, 'Sign=WXPay', mch_id, timeStamp, prepay_id);
                    var args = {
                        appId: appid,
                        timeStamp: timeStamp,
                        nonceStr: nonce_str,
                        signType: "MD5",
                        mch_id: mch_id,
                        prepay_id: prepay_id,
                        paySign: _paySignjs,
                        out_trade_no: _out_trade_no
                    };
                    EWTRACEIFY(args);
                    resolve(args);
                    EWTRACE("wxPayment End");
                }
            });
        });
    };

    Wxpay.remoteMethod(
        'wxPayment',
        {
            http: { verb: 'post' },
            description: '微信支付预下单',
            accepts: { arg: 'fee', type: 'string', description: '{"fee":"",' },
            returns: { arg: 'RegionInfo', type: 'object', root: true }
        }
    );



    Wxpay.wxnotify = function (a, cb) {
        console.log("wxnotify");
        var param = a.xml;
        param.nstr = a.xml.out_trade_no[0];

        var trade_type = a.xml.trade_type[0];

        var return_code = param.return_code[0];
        var result_code = param.result_code[0];

        if (return_code == "SUCCESS" && result_code == "SUCCESS") {

            var _orderid = a.xml.out_trade_no[0];

            var bsSQL = "update cd_TstyleOrders set status = 'commit' where payid = '" + _orderid + "'";

            DoSQL(bsSQL).then(function () {
                var backXml = '<xml xmlns="eshine"><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[]]></return_msg></xml>';
                cb(null, backXml, 'text/xml; charset=utf-8');
            }, function (err) {
                var backXml = '<xml xmlns="eshine"><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[]]></return_msg></xml>';
                cb(null, backXml, 'text/xml; charset=utf-8');
            })
        }

    }

    // server.js 文件头必须包含这两句话，否则xml无法解析
    var xmlparser = require('express-xml-bodyparser');
    app.use(xmlparser());


    Wxpay.remoteMethod(
        'wxnotify',
        {
            http: { verb: 'post' },
            description: '新增公司(bm_Company)',
            accepts: [
                {
                    arg: 'a',
                    type: 'xml',
                    description: "wx-pay-back",
                    http: { source: 'body' }
                }
            ],
            returns: [{ arg: 'body', type: 'file', root: true }, { arg: 'Content-Type', type: 'string', http: { target: 'header' } }]
        }
    );



};
