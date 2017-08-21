
module.exports = function (Wxpay) {

    var app = require('../../server/server');
    app.DisableSystemMethod(Wxpay);

    var _ = require('underscore');
    var uuid = require('node-uuid');

    Wxpay.WX_Pay = function (payInfo) {
        console.log("WX_Pay Begin");
        return new Promise(function (resolve, reject) {
            var WXPay = require('weixin-pay');

            var wxpay = WXPay({
                appid: 'wxb74654c82da12482',
                mch_id: '1254501201',
                partner_key: '1231314202eshineem2015weixinpays', //微信商户平台API密钥
                pfx: '' //微信商户平台证书
            });

            var _out_trade_no = uuid.v4().replace(/-/g, "");
            payInfo.out_trade_no = _out_trade_no;

            wxpay.createUnifiedOrder({
                body: '扫码支付测试',
                out_trade_no: _out_trade_no,
                total_fee: payInfo.fee * 100,
                spbill_create_ip: '192.168.2.210',
                notify_url: 'http://style.man-kang.com/api/Wxpays/wxnotify',
                trade_type: 'NATIVE',
                product_id: '1234567890'
            }, function (err, result) {

                if (err) {
                    console.log(err.message);
                    reject(err);
                } else {
                    console.log(result);
                    resolve(result);
                }
            });
        });
    };

    Wxpay.remoteMethod(
        'WX_Pay',
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

            DoSQL(bsSQL).then(function(){
                var backXml = '<xml xmlns="eshine"><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[]]></return_msg></xml>';
                cb(null, backXml, 'text/xml; charset=utf-8');
            },function(err){
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
