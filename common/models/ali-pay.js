'use strict';


module.exports = function (AliPay) {
    var app = require('../../server/server');
    app.DisableSystemMethod(AliPay);

    var uuid = require('node-uuid');

    AliPay.Ali_Pay = function (cb) {
        console.log("Ali_Pay Begin");

        const fs = require('fs');
        const path = require('path');
        const Alipay = require('alipay2');

        const alipay = new Alipay({
            appId: '2015092200313107',
            signType :'RSA',
            appKey: `-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQDP6walVtvIO55815HougB2VuSHxKpEEinXm5Ybmfh2uDTiwQX1
K4cYNpZVydNxJW8YvrkkgFrvsteJCVJqPAQlZQGINpdoZhJpzuUFydvaSrnpmAk/
pIXRcUvlW6WraCG56rgGo4Ym1dBMKg8AaVdU5A5RWwT/bT9DhMIhv+iKaQIDAQAB
AoGBAKmBTRC8aD+swz+6Kz0Vbs0LeBJrtff66tvY/x6Pfy2ibZMzlBzVmLSXxCY6
fUPwJcuBqcTlU725Ctiwndz4AtPVXF6aePQAOQo47ayEDTxwKe7ZocEL6xh8nEMO
oGbPZOOFYrpY9+STL+KHFbyARUwRAm+G99AI6xRk/dgQmWllAkEA7Rk8dabIK5w9
dnjuoW7mYJxzn8+JupRT/XzgCPNcbm8SvYCBn2JTrCocpaKw97FSwH9ggbZAsujZ
IXPq3sfxxwJBAOB+RF7xhj+fK9BO+JDsK/2/nIrjMF6OTR0BBUyzRPx850jJEcPh
makgiRe+QAjlGtFl0YLZj8X9XaWwdj0jok8CQF1fD9lBWhkaiXXrgAZhFya61in8
YD/zA/SSxeOgeykeYuHwBpwO6+akGu372PdihLU8NHRAotASNNggv0EGuqcCQGav
OuTWwxps2ySgSrA3ZvPdZmRdAO3vVzRyGBN6WI7JLx2q4xZfJeMnf629lxq6eObZ
FNkuXMYqW2CDc8IJf58CQQCeUO+jgjCpjD1RSVvW10MWPR4aCvBwON3SeYaHG4xh
0Xz+jHN9gCwzwUlSBuZpckHYKg0KGicKCuovhxqedW0f
-----END RSA PRIVATE KEY-----`,
            alipayPublicKey: `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDDI6d306Q8fIfCOaTXyiUeJHkr
IvYISRcc73s3vF1ZT7XN8RNPwJxo8pWaJMmvyTn9N4HQ632qJBVHf8sxHi/fEsra
prwCtzvzQETrNRwVxLO5jVmRGi60j8Ue1efIlzPXV9je9mkjzOmdssymZkh2QhUr
CmZYI/FCEa3/cNMW0QIDAQAB
-----END PUBLIC KEY-----`,
        });

        alipay.precreate({
            subject: 'Example'
            , out_trade_no: uuid.v4()
            , total_amount: '0.01'
            , timeout_express: '10m'
        }).then(function (res) {
            console.log(res);
            cb( null, { status: 1, "result": res });
        }).catch(function( err ) {
            console.log(err);
        });
    }

    AliPay.remoteMethod(
        'Ali_Pay',
        {
            http: { verb: 'post' },
            description: '新增公司(bm_Company)',
            returns: { arg: 'CompanyInfo', type: 'object', root: true }
        }
    );

    AliPay.alnotify = function(a, cb) {
                console.log(a);
		var oo = {};
		oo.ordersId = a.out_trade_no;
		oo.trade_status = a.trade_status;
		oo.map  = a;
		oo.payType = "alipayWeb";

		var param = JSON.stringify(oo);
		var status = "fail";

		// console.log(a.trade_status);
		if(oo.trade_status == "TRADE_SUCCESS"){

			status =  "success";
		}
		cb(null, status, 'text/plain; charset=utf-8');
	}

	AliPay.remoteMethod(
		'alnotify',
		{
			accepts: [
				{ arg: 'p', type: 'object',
					http: function(ctx) {
						var req = ctx.req;
						return req.body;
					}
				}
			],
			returns: [{arg: 'body', type: 'file',root:true},{arg: 'Content-Type', type: 'string', http: { target: 'header' }}],
			http: {path: '/alnotify', verb: 'post'}
		}
	);    
};
