var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var ArtifactScraperDirect;
(function (ArtifactScraperDirect) {
    var artifactInfoBasic = ["id", "name", "description"];
    var artifactInfoPackage = __spreadArray(["package"], artifactInfoBasic, true);
    var artifactInfoTitle = __spreadArray(["title"], artifactInfoPackage, true);
    var artifactInfoLaunchpad = __spreadArray(["startApp"], artifactInfoTitle, true);
    var artifactInfoTile = __spreadArray([
        "actionApplication",
        "settings",
        "actionType"
    ], artifactInfoTitle, true);
    var artifactScrapers = [
        {
            artifactType: "launchpad",
            repositoryName: "launchpad",
            selectInfo: artifactInfoLaunchpad,
            artifactMapFn: mapLaunchpad,
            usingFn: [
                { propertyExtractFn: function (x) { return x.cat; }, artifactType: "tile_group" },
                mapLaunchpadApp,
            ],
        },
        {
            artifactType: "tile_group",
            repositoryName: "category",
            selectInfo: artifactInfoTitle,
            artifactMapFn: mapLaunchpad,
            usingFn: [
                { propertyExtractFn: function (x) { return x.tilegroups; }, artifactType: "tile_group" },
                { propertyExtractFn: function (x) { return x.tiles; }, artifactType: "tile" },
            ],
        },
        {
            artifactType: "tile",
            repositoryName: "tile",
            selectInfo: artifactInfoTile,
            artifactMapFn: mapLaunchpad,
            usingFn: [{ propertyExtractFn: function (x) { return x.roles; }, artifactType: "role" }, mapTileChildren],
        },
    ];
    complete({
        scrapeArtifacts: scrapeArtifacts,
    });
    function mapLaunchpadApp(data) {
        var using = [];
        if (data.startApp && data.startApp.length > 0) {
            using.push({ id: data.startApp, type: "app" });
        }
        return using;
    }
    function mapLaunchpad(_a) {
        var id = _a.id, name = _a.name, package = _a.package, title = _a.title, description = _a.description;
        return [
            {
                type: "",
                packageId: package,
                packageName: null,
                objectId: id,
                name: name,
                id: uuid(),
                parents: [package],
                children: [],
                using: [],
                used_by: [],
                title: title,
                description: description,
            },
        ];
    }
    function mapTileChildren(data) {
        var _a, _b, _c, _d;
        var children = [];
        var tile = data;
        if (tile.actionApplication && (tile.actionType === "A" || !tile.actionType)) {
            children.push({ id: tile.actionApplication, type: "app" });
        }
        if (((_b = (_a = tile.settings) === null || _a === void 0 ? void 0 : _a.adaptive) === null || _b === void 0 ? void 0 : _b.id) && tile.actionType === "F") {
            children.push({ id: tile.settings.adaptive.id.toUpperCase(), type: "adaptive" });
        }
        if ((_d = (_c = tile.settings) === null || _c === void 0 ? void 0 : _c.adaptive) === null || _d === void 0 ? void 0 : _d.idTile) {
            children.push({ id: tile.settings.adaptive.idTile.toUpperCase(), type: "adaptive" });
        }
        /*for (const role of tile.roles) {
        children.push({id: role.id, type: "role"});
    }*/
        return children;
    }
    function scrapeArtifacts() {
        return __awaiter(this, void 0, void 0, function () {
            var manager, allArtifacts, _i, artifactScrapers_1, scraper, res, final;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        manager = p9.manager ? p9.manager : modules.typeorm.getConnection().manager;
                        allArtifacts = [];
                        _i = 0, artifactScrapers_1 = artifactScrapers;
                        _a.label = 1;
                    case 1:
                        if (!(_i < artifactScrapers_1.length)) return [3 /*break*/, 4];
                        scraper = artifactScrapers_1[_i];
                        return [4 /*yield*/, scrapeIt(scraper, manager)];
                    case 2:
                        res = _a.sent();
                        allArtifacts.push(res);
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        final = allArtifacts.reduce(function (acc, x) { return __spreadArray(__spreadArray([], acc, true), x, true); }, []);
                        final.forEach(function (x) {
                            var _a;
                            var _b;
                            if (x.type === "package") {
                                (_a = x.children).push.apply(_a, final
                                    .filter(function (y) { return y.packageId === x.objectId; })
                                    .map(function (x) { return ({ id: x.objectId, type: x.type }); }));
                            }
                            if (x.type !== "package") {
                                var checkedChildren_1 = [];
                                (_b = x.using) === null || _b === void 0 ? void 0 : _b.forEach(function (child) {
                                    var _a;
                                    var childArtifact = final.find(function (z) { return z.objectId === child.id; });
                                    if (childArtifact) {
                                        if (x.type === "tile") {
                                        }
                                        (_a = childArtifact.used_by) === null || _a === void 0 ? void 0 : _a.push({ id: x.objectId, type: x.type });
                                        checkedChildren_1.push(child);
                                    }
                                });
                            }
                        });
                        return [2 /*return*/, final];
                }
            });
        });
    }
    function scrapeIt(scraper, manager) {
        return __awaiter(this, void 0, void 0, function () {
            var artifactData, artifacts, _loop_1, _i, artifactData_1, artifact, requestError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log(scraper.artifactType);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, manager.find(scraper.repositoryName, {
                                select: scraper.selectInfo,
                                loadRelationIds: scraper.artifactType !== "table",
                            })];
                    case 2:
                        artifactData = _a.sent();
                        return [4 /*yield*/, artifactData
                                .map(scraper.artifactMapFn)
                                .flat()
                                .map(function (x) {
                                x.type = scraper.artifactType;
                                return x;
                            })];
                    case 3:
                        artifacts = _a.sent();
                        if (scraper.usingFn || scraper.childrenFn) {
                            _loop_1 = function (artifact) {
                                var targetArtifact = artifacts.find(function (x) { return x.objectId === artifact.id; });
                                if (scraper.childrenFn) {
                                    var allChildren = [];
                                    var _loop_2 = function (childrenFn) {
                                        if (childrenFn instanceof Function) {
                                            allChildren.push(childrenFn(artifact));
                                        }
                                        else {
                                            allChildren.push(childrenFn.propertyExtractFn(artifact).map(function (x) {
                                                return { id: x, type: childrenFn.artifactType };
                                            }));
                                        }
                                    };
                                    for (var _b = 0, _c = scraper.childrenFn; _b < _c.length; _b++) {
                                        var childrenFn = _c[_b];
                                        _loop_2(childrenFn);
                                    }
                                    targetArtifact.children = allChildren.reduce(function (acc, x) { return __spreadArray(__spreadArray([], acc, true), x, true); }, []);
                                }
                                if (scraper.usingFn) {
                                    var allUsing = [];
                                    var _loop_3 = function (usingFn) {
                                        if (usingFn instanceof Function) {
                                            allUsing.push(usingFn(artifact));
                                        }
                                        else {
                                            allUsing.push(usingFn.propertyExtractFn(artifact).map(function (x) {
                                                return { id: x, type: usingFn.artifactType };
                                            }));
                                        }
                                    };
                                    for (var _d = 0, _e = scraper.usingFn; _d < _e.length; _d++) {
                                        var usingFn = _e[_d];
                                        _loop_3(usingFn);
                                    }
                                    targetArtifact.using = allUsing.reduce(function (acc, x) { return __spreadArray(__spreadArray([], acc, true), x, true); }, []);
                                }
                            };
                            for (_i = 0, artifactData_1 = artifactData; _i < artifactData_1.length; _i++) {
                                artifact = artifactData_1[_i];
                                _loop_1(artifact);
                            }
                        }
                        return [2 /*return*/, artifacts];
                    case 4:
                        requestError_1 = _a.sent();
                        console.error(requestError_1);
                        return [2 /*return*/, []];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
})(ArtifactScraperDirect || (ArtifactScraperDirect = {}));
