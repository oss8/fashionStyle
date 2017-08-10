'use strict';

module.exports = function (Fdesign) {

    var app = require('../../server/server');
    app.DisableSystemMethod(Fdesign);
    var colors = require('color');
    var _ = require('underscore');

    Fdesign.GetTypeversionResources = function (baseInfo, cb) {
        EWTRACE("GetTypeversionResources Begin");

        var pv = [];
        var bsSQL = "select baseId,baseName,neckName,armName,ornament from cd_baseVersion where baseId = '" + baseInfo.Typeversion + "'";
        var _baseVersion = {};
        pv.push(ExecuteSyncSQLResult(bsSQL, _baseVersion));

        bsSQL = "select positionType,name,concat(Gender,baseId,direction,positionType,detailId,'.png') as file from cd_detailVersion where direction = 'A' And gender = '" + baseInfo.Gender + "' and baseId = '" + baseInfo.Typeversion + "'";
        var _A_detailVersion = {};
        pv.push(ExecuteSyncSQLResult(bsSQL, _A_detailVersion));

        bsSQL = "select positionType,name,concat(Gender,baseId,direction,positionType,detailId,'.png') as file from cd_detailVersion where direction = 'B' And gender = '" + baseInfo.Gender + "' and baseId = '" + baseInfo.Typeversion + "'";
        var _B_detailVersion = {};
        pv.push(ExecuteSyncSQLResult(bsSQL, _B_detailVersion));

        bsSQL = "select name, concat('pattern_',publicId,'.png') as file from cd_publicImage";
        var _publicImage = {};
        pv.push(ExecuteSyncSQLResult(bsSQL, _publicImage));


        bsSQL = "select name, value from cd_colorVersion where baseId = '" + baseInfo.Typeversion + "'";
        var _colorVersion = {};
        pv.push(ExecuteSyncSQLResult(bsSQL, _colorVersion));

        Promise.all(pv).then(function () {
            if (_baseVersion.Result.length == 0) {
                cb(Error('基础版型未找到！'), { status: 0, "result": "" });
                return;
            }
            var result = {};

            result.Gender = baseInfo.Gender;
            result.Typeversion = baseInfo.Typeversion;
            result.data = {};


            var _A = {};
            _A.neck = {};
            _A.neck.name = _baseVersion.Result[0].neckName;
            _A.neck.fileList = _.filter(_A_detailVersion.Result, function (fitem) { return fitem.positionType == '01' });

            _A.arm = {};
            _A.arm.name = _baseVersion.Result[0].armName;
            _A.arm.fileList = _.filter(_A_detailVersion.Result, function (fitem) { return fitem.positionType == '02' });

            _A.ornament = {};
            _A.ornament.name = _baseVersion.Result[0].ornament;
            _A.ornament.fileList = _.filter(_A_detailVersion.Result, function (fitem) { return fitem.positionType == '03' });

            _A.color = {};
            _A.color.name = '颜色';
            _A.color.fileList = _colorVersion.Result;


            _A.pattern = {};
            _A.pattern.name = '贴图';
            _A.pattern.fileList = _publicImage.Result;
            result.data.A = _A;

            var _B = {};
            _B.neck = {};
            _B.neck.name = _baseVersion.Result[0].neckName;
            _B.neck.fileList = _.filter(_B_detailVersion.Result, function (fitem) { return fitem.positionType == '01' });

            _B.arm = {};
            _B.arm.name = _baseVersion.Result[0].armName;
            _B.arm.fileList = _.filter(_B_detailVersion.Result, function (fitem) { return fitem.positionType == '02' });

            _B.ornament = {};
            _B.ornament.name = _baseVersion.Result[0].ornament;
            _B.ornament.fileList = _.filter(_B_detailVersion.Result, function (fitem) { return fitem.positionType == '03' });

            _B.color = {};
            _B.color.name = '颜色';
            _B.color.fileList = _colorVersion.Result;
            _B.pattern = {};
            _B.pattern.name = '贴图';
            _B.pattern.fileList = _publicImage.Result;

            result.data.B = _B;


            cb(null, { status: 1, "result": result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    };

    Fdesign.remoteMethod(
        'GetTypeversionResources',
        {
            http: { verb: 'post' },
            description: '获取指定版型的图片信息',
            accepts: { arg: 'baseInfo', type: 'object', description: '{"Gender":"A","Typeversion":"02"}' },
            returns: { arg: 'baseInfo', type: 'object', root: true }
        }
    );


    Fdesign.GetBaseInfo = function (cb) {
        EWTRACE("GetBaseInfo Begin");

        var bsSQL = "select baseId,baseName,Gender from cd_baseVersion where status = 1";

        DoSQL(bsSQL).then(function (result) {

            var _result = {};

            _result.M = _.filter(result, function (fitem) {
                return fitem.Gender == "M" || fitem.Gender == "A";
            })
            _result.W = _.filter(result, function (fitem) {
                return fitem.Gender == "W" || fitem.Gender == "A";
            })

            cb(null, { status: 1, "result": _result });
        }, function (err) {
            cb(err, { status: 0, "result": "" });
        });
    };

    Fdesign.remoteMethod(
        'GetBaseInfo',
        {
            http: { verb: 'post' },
            description: '获取版型的基础信息',
            returns: { arg: 'baseInfo', type: 'object', root: true }
        }
    );
};
