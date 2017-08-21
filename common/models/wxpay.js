'use strict';

module.exports = function (Wxpay) {

    var app = require('../../server/server');
    app.DisableSystemMethod(Wxpay);

    var _ = require('underscore');


    Wxpay.WX_Pay = function (cb) {
        console.log("WX_Pay Begin");

        var WXPay = require('weixin-pay');

        var wxpay = WXPay({
            appid: 'wxb74654c82da12482',
            mch_id: '1254501201',
            partner_key: '1231314202eshineem2015weixinpays', //微信商户平台API密钥
            pfx: '' //微信商户平台证书
        });

        var _out_trade_no = Math.random().toString(36).substr(2, 15);

        wxpay.createUnifiedOrder({
            body: '扫码支付测试',
            out_trade_no: _out_trade_no,
            total_fee: 1,
            spbill_create_ip: '192.168.2.210',
            notify_url: 'http://gl.box.eshine.cn/api/Wxpays/wxnotify',
            trade_type: 'NATIVE',
            product_id: '1234567890'
        }, function (err, result) {
            result.out_trade_no = _out_trade_no;
            console.log(result);
            cb(null, { status: 1, "result": result });
        });

    }

    Wxpay.remoteMethod(
        'WX_Pay',
        {
            http: { verb: 'post' },
            description: '新增公司(bm_Company)',
            returns: { arg: 'CompanyInfo', type: 'object', root: true }
        }
    );


    Wxpay.wxnotify = function (p, cb) {
        console.log("wxnotify");
        console.log(p.xml);

        var backXml = '<xml xmlns="eshine"><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[]]></return_msg></xml>';
        cb(null, backXml, 'text/xml; charset=utf-8');
    }

// server.js 文件头必须包含这两句话，否则xml无法解析
var xmlparser = require('express-xml-bodyparser');
app.use(xmlparser());


    Wxpay.remoteMethod(
        'wxnotify',
        {
            http: { verb: 'post' },
            description: '新增公司(bm_Company)',
            accepts: [
                {
                    arg: 'p',
                    type: 'xml',
                    description: "wx-pay-back",
                    http: { source: 'body' }
                }
            ],
            returns: [{ arg: 'body', type: 'file', root: true }, { arg: 'Content-Type', type: 'string', http: { target: 'header' } }]
        }
    );



};
