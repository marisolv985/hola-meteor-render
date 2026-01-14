Package["core-runtime"].queue("minifier-css",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var transformResult, CssTools;

var require = meteorInstall({"node_modules":{"meteor":{"minifier-css":{"minifier.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/minifier-css/minifier.js                                                                                 //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reifyAsyncResult__) {"use strict"; try {module.export({CssTools:()=>CssTools});let _async_to_generator;module.link("@swc/helpers/_/_async_to_generator",{_(v){_async_to_generator=v}},0);let path;module.link('path',{default(v){path=v}},1);let url;module.link('url',{default(v){url=v}},2);let postcss;module.link('postcss',{default(v){postcss=v}},3);let cssnano;module.link('cssnano',{default(v){cssnano=v}},4);if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();




const CssTools = {
    /**
   * Parse the incoming CSS string; return a CSS AST.
   *
   * @param {string} cssText The CSS string to be parsed.
   * @param {Object} options Options to pass to the PostCSS parser.
   * @return {postcss#Root} PostCSS Root AST.
   */ parseCss (cssText, options = {}) {
        // This function previously used the `css-parse` npm package, which
        // set the name of the css file being parsed using  { source: 'filename' }.
        // If included, we'll convert this to the `postcss` equivalent, to maintain
        // backwards compatibility.
        if (options.source) {
            options.from = options.source;
            delete options.source;
        }
        return postcss.parse(cssText, options);
    },
    /**
   * Using the incoming CSS AST, create and return a new object with the
   * generated CSS string, and optional sourcemap details.
   *
   * @param {postcss#Root} cssAst PostCSS Root AST.
   * @param {Object} options Options to pass to the PostCSS parser.
   * @return {Object} Format: { code: 'css string', map: 'sourcemap deatils' }.
   */ stringifyCss (cssAst, options = {}) {
        // This function previously used the `css-stringify` npm package, which
        // controlled sourcemap generation by passing in { sourcemap: true }.
        // If included, we'll convert this to the `postcss` equivalent, to maintain
        // backwards compatibility.
        if (options.sourcemap) {
            options.map = {
                inline: false,
                annotation: false,
                sourcesContent: false
            };
            delete options.sourcemap;
        }
        // explicitly set from to undefined to prevent postcss warnings
        if (!options.from) {
            options.from = void 0;
        }
        transformResult = cssAst.toResult(options);
        return {
            code: transformResult.css,
            map: transformResult.map ? transformResult.map.toJSON() : null
        };
    },
    /**
   * Minify the passed in CSS string.
   *
   * @param {string} cssText CSS string to minify.
   * @return {Promise<String[]>} Array containing the minified CSS.
   */ minifyCss (cssText) {
        return CssTools.minifyCssAsync(cssText);
    },
    /**
   * Minify the passed in CSS string.
   *
   * @param {string} cssText CSS string to minify.
   * @return {Promise<String[]>} Array containing the minified CSS.
   */ minifyCssAsync (cssText) {
        return _async_to_generator(function*() {
            return yield postcss([
                cssnano({
                    safe: true
                })
            ]).process(cssText, {
                from: void 0
            }).then((result)=>[
                    result.css
                ]);
        })();
    },
    /**
   * Merge multiple CSS AST's into one.
   *
   * @param {postcss#Root[]} cssAsts Array of PostCSS Root objects.
   * @callback warnCb Callback used to handle warning messages.
   * @return {postcss#Root} PostCSS Root object.
   */ mergeCssAsts (cssAsts, warnCb) {
        const rulesPredicate = (rules, exclude = false)=>{
            if (!Array.isArray(rules)) {
                rules = [
                    rules
                ];
            }
            return (node)=>{
                // PostCSS AtRule nodes have `type: 'atrule'` and a descriptive name,
                // e.g. 'import' or 'charset', while Comment nodes have type only.
                const nodeMatchesRule = rules.includes(node.name || node.type);
                return exclude ? !nodeMatchesRule : nodeMatchesRule;
            };
        };
        // Simple concatenation of CSS files would break @import rules
        // located in the beginning of a file. Before concatenation, pull
        // @import rules to the beginning of a new syntax tree so they always
        // precede other rules.
        const newAst = postcss.root();
        cssAsts.forEach((ast)=>{
            if (ast.nodes) {
                // Pick only the imports from the beginning of file ignoring @charset
                // rules as every file is assumed to be in UTF-8.
                const charsetRules = ast.nodes.filter(rulesPredicate('charset'));
                if (charsetRules.some((rule)=>{
                    // According to MDN, only 'UTF-8' and "UTF-8" are the correct
                    // encoding directives representing UTF-8.
                    return !/^(['"])UTF-8\1$/.test(rule.params);
                })) {
                    warnCb(ast.filename, '@charset rules in this file will be ignored as UTF-8 is the ' + 'only encoding supported');
                }
                ast.nodes = ast.nodes.filter(rulesPredicate('charset', true));
                let importCount = 0;
                for(let i = 0; i < ast.nodes.length; i++){
                    if (!rulesPredicate([
                        'import',
                        'comment'
                    ])(ast.nodes[i])) {
                        importCount = i;
                        break;
                    }
                }
                CssTools.rewriteCssUrls(ast);
                const imports = ast.nodes.splice(0, importCount);
                newAst.nodes.push(...imports);
                // If there are imports left in the middle of a file, warn users as it
                // might be a potential bug (imports are only valid at the beginning of
                // a file).
                if (ast.nodes.some(rulesPredicate('import'))) {
                    warnCb(ast.filename, 'There are some @import rules in the middle of a file. This ' + 'might be a bug, as imports are only valid at the beginning of ' + 'a file.');
                }
            }
        });
        // Now we can put the rest of CSS rules into new AST.
        cssAsts.forEach((ast)=>{
            if (ast.nodes) {
                newAst.nodes.push(...ast.nodes);
            }
        });
        return newAst;
    },
    /**
   * We are looking for all relative urls defined with the `url()` functional
   * notation and rewriting them to the equivalent absolute url using the
   * `source` path provided by postcss. For performance reasons this function
   * acts by side effect by modifying the given AST without doing a deep copy.
   *
   * @param {postcss#Root} ast PostCSS Root object.
   * @return Modifies the ast param in place.
   */ rewriteCssUrls (ast) {
        const mergedCssPath = '/';
        rewriteRules(ast.nodes, mergedCssPath);
    }
};
if (typeof Profile !== 'undefined') {
    [
        'parseCss',
        'stringifyCss',
        'minifyCss',
        'minifyCssAsync',
        'mergeCssAsts',
        'rewriteCssUrls'
    ].forEach((funcName)=>{
        CssTools[funcName] = Profile(`CssTools.${funcName}`, CssTools[funcName]);
    });
}

const hasOwn = Object.prototype.hasOwnProperty;
const rewriteRules = (rules, mergedCssPath)=>{
    rules.forEach((rule)=>{
        // Recurse if there are sub-rules. An example:
        //     @media (...) {
        //         .rule { url(...); }
        //     }
        if (hasOwn.call(rule, 'nodes')) {
            rewriteRules(rule.nodes, mergedCssPath);
        }
        const appDir = process.cwd();
        const sourceFile = rule.source.input.file;
        const sourceFileFromAppRoot = sourceFile ? sourceFile.replace(appDir, '') : '';
        let basePath = pathJoin('/', pathDirname(sourceFileFromAppRoot));
        // Set the correct basePath based on how the linked asset will be served.
        // XXX This is wrong. We are coupling the information about how files will
        // be served by the web server to the information how they were stored
        // originally on the filesystem in the project structure. Ideally, there
        // should be some module that tells us precisely how each asset will be
        // served but for now we are just assuming that everything that comes from
        // a folder starting with "/packages/" is served on the same path as
        // it was on the filesystem and everything else is served on root "/".
        if (!basePath.match(/^\/?packages\//i)) {
            basePath = "/";
        }
        let value = rule.value;
        // Match css values containing some functional calls to `url(URI)` where
        // URI is optionally quoted.
        // Note that a css value can contains other elements, for instance:
        //   background: top center url("background.png") black;
        // or even multiple url(), for instance for multiple backgrounds.
        var cssUrlRegex = /url\s*\(\s*(['"]?)(.+?)\1\s*\)/gi;
        let parts;
        while(parts = cssUrlRegex.exec(value)){
            const oldCssUrl = parts[0];
            const quote = parts[1];
            const resource = url.parse(parts[2]);
            // We don't rewrite URLs starting with a protocol definition such as
            // http, https, or data, or those with network-path references
            // i.e. //img.domain.com/cat.gif
            if (resource.protocol !== null || resource.href.startsWith('//') || resource.href.startsWith('#')) {
                continue;
            }
            // Rewrite relative paths (that refers to the internal application tree)
            // to absolute paths (addressable from the public build).
            let absolutePath = isRelative(resource.path) ? pathJoin(basePath, resource.path) : resource.path;
            if (resource.hash) {
                absolutePath += resource.hash;
            }
            // We used to finish the rewriting process at the absolute path step
            // above. But it didn't work in case the Meteor application was deployed
            // under a sub-path (eg `ROOT_URL=http://localhost:3000/myapp meteor`)
            // in which case the resources linked in the merged CSS file would miss
            // the `myapp/` prefix. Since this path prefix is only known at launch
            // time (rather than build time) we can't use absolute paths to link
            // resources in the generated CSS.
            //
            // Instead we transform absolute paths to make them relative to the
            // merged CSS, leaving to the browser the responsibility to calculate
            // the final resource links (by adding the application deployment
            // prefix, here `myapp/`, if applicable).
            const relativeToMergedCss = pathRelative(mergedCssPath, absolutePath);
            const newCssUrl = `url(${quote}${relativeToMergedCss}${quote})`;
            value = value.replace(oldCssUrl, newCssUrl);
        }
        rule.value = value;
    });
};
const isRelative = (path)=>path && path.charAt(0) !== '/';
// These are duplicates of functions in tools/files.js, because we don't have
// a good way of exporting them into packages.
// XXX deduplicate files.js into a package at some point so that we can use it
// in core
const toOSPath = (p)=>process.platform === 'win32' ? p.replace(/\//g, '\\') : p;
const toStandardPath = (p)=>process.platform === 'win32' ? p.replace(/\\/g, '/') : p;
const pathJoin = (a, b)=>toStandardPath(path.join(toOSPath(a), toOSPath(b)));
const pathDirname = (p)=>toStandardPath(path.dirname(toOSPath(p)));
const pathRelative = (p1, p2)=>toStandardPath(path.relative(toOSPath(p1), toOSPath(p2)));
//*/
__reifyAsyncResult__();} catch (_reifyError) { __reifyAsyncResult__(_reifyError); }}, { self: this, async: false });
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"postcss":{"package.json":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// node_modules/meteor/minifier-css/node_modules/postcss/package.json                                                //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.exports = {
  "name": "postcss",
  "version": "8.5.1",
  "main": "./lib/postcss.js"
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"postcss.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// node_modules/meteor/minifier-css/node_modules/postcss/lib/postcss.js                                              //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"cssnano":{"package.json":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// node_modules/meteor/minifier-css/node_modules/cssnano/package.json                                                //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.exports = {
  "name": "cssnano",
  "version": "5.1.15",
  "main": "src/index.js"
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"src":{"index.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// node_modules/meteor/minifier-css/node_modules/cssnano/src/index.js                                                //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      CssTools: CssTools
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/minifier-css/minifier.js"
  ],
  mainModulePath: "/node_modules/meteor/minifier-css/minifier.js"
}});

//# sourceURL=meteor://💻app/packages/minifier-css.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaWZpZXItY3NzL21pbmlmaWVyLmpzIl0sIm5hbWVzIjpbIkNzc1Rvb2xzIiwicGFyc2VDc3MiLCJjc3NUZXh0Iiwib3B0aW9ucyIsInNvdXJjZSIsImZyb20iLCJwb3N0Y3NzIiwicGFyc2UiLCJzdHJpbmdpZnlDc3MiLCJjc3NBc3QiLCJzb3VyY2VtYXAiLCJtYXAiLCJpbmxpbmUiLCJhbm5vdGF0aW9uIiwic291cmNlc0NvbnRlbnQiLCJ0cmFuc2Zvcm1SZXN1bHQiLCJ0b1Jlc3VsdCIsImNvZGUiLCJjc3MiLCJ0b0pTT04iLCJtaW5pZnlDc3MiLCJtaW5pZnlDc3NBc3luYyIsImNzc25hbm8iLCJzYWZlIiwicHJvY2VzcyIsInRoZW4iLCJyZXN1bHQiLCJtZXJnZUNzc0FzdHMiLCJjc3NBc3RzIiwid2FybkNiIiwicnVsZXNQcmVkaWNhdGUiLCJydWxlcyIsImV4Y2x1ZGUiLCJBcnJheSIsImlzQXJyYXkiLCJub2RlIiwibm9kZU1hdGNoZXNSdWxlIiwiaW5jbHVkZXMiLCJuYW1lIiwidHlwZSIsIm5ld0FzdCIsInJvb3QiLCJmb3JFYWNoIiwiYXN0Iiwibm9kZXMiLCJjaGFyc2V0UnVsZXMiLCJmaWx0ZXIiLCJzb21lIiwicnVsZSIsInRlc3QiLCJwYXJhbXMiLCJmaWxlbmFtZSIsImltcG9ydENvdW50IiwiaSIsImxlbmd0aCIsInJld3JpdGVDc3NVcmxzIiwiaW1wb3J0cyIsInNwbGljZSIsInB1c2giLCJtZXJnZWRDc3NQYXRoIiwicmV3cml0ZVJ1bGVzIiwiUHJvZmlsZSIsImZ1bmNOYW1lIiwiaGFzT3duIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiYXBwRGlyIiwiY3dkIiwic291cmNlRmlsZSIsImlucHV0IiwiZmlsZSIsInNvdXJjZUZpbGVGcm9tQXBwUm9vdCIsInJlcGxhY2UiLCJiYXNlUGF0aCIsInBhdGhKb2luIiwicGF0aERpcm5hbWUiLCJtYXRjaCIsInZhbHVlIiwiY3NzVXJsUmVnZXgiLCJwYXJ0cyIsImV4ZWMiLCJvbGRDc3NVcmwiLCJxdW90ZSIsInJlc291cmNlIiwidXJsIiwicHJvdG9jb2wiLCJocmVmIiwic3RhcnRzV2l0aCIsImFic29sdXRlUGF0aCIsImlzUmVsYXRpdmUiLCJwYXRoIiwiaGFzaCIsInJlbGF0aXZlVG9NZXJnZWRDc3MiLCJwYXRoUmVsYXRpdmUiLCJuZXdDc3NVcmwiLCJjaGFyQXQiLCJ0b09TUGF0aCIsInAiLCJwbGF0Zm9ybSIsInRvU3RhbmRhcmRQYXRoIiwiYSIsImIiLCJqb2luIiwiZGlybmFtZSIsInAxIiwicDIiLCJyZWxhdGl2ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQXdCO0FBQ0Y7QUFDUTtBQUNBO0FBRTlCLE1BQU1BLFdBQVc7SUFDZjs7Ozs7O0dBTUMsR0FDREMsVUFBU0MsT0FBTyxFQUFFQyxVQUFVLENBQUMsQ0FBQztRQUM1QixtRUFBbUU7UUFDbkUsMkVBQTJFO1FBQzNFLDJFQUEyRTtRQUMzRSwyQkFBMkI7UUFDM0IsSUFBSUEsUUFBUUMsTUFBTSxFQUFFO1lBQ2xCRCxRQUFRRSxJQUFJLEdBQUdGLFFBQVFDLE1BQU07WUFDN0IsT0FBT0QsUUFBUUMsTUFBTTtRQUN2QjtRQUNBLE9BQU9FLFFBQVFDLEtBQUssQ0FBQ0wsU0FBU0M7SUFDaEM7SUFFQTs7Ozs7OztHQU9DLEdBQ0RLLGNBQWFDLE1BQU0sRUFBRU4sVUFBVSxDQUFDLENBQUM7UUFDL0IsdUVBQXVFO1FBQ3ZFLHFFQUFxRTtRQUNyRSwyRUFBMkU7UUFDM0UsMkJBQTJCO1FBQzNCLElBQUlBLFFBQVFPLFNBQVMsRUFBRTtZQUNyQlAsUUFBUVEsR0FBRyxHQUFHO2dCQUNaQyxRQUFRO2dCQUNSQyxZQUFZO2dCQUNaQyxnQkFBZ0I7WUFDbEI7WUFDQSxPQUFPWCxRQUFRTyxTQUFTO1FBQzFCO1FBQ0EsK0RBQStEO1FBQy9ELElBQUksQ0FBQ1AsUUFBUUUsSUFBSSxFQUFDO1lBQ2hCRixRQUFRRSxJQUFJ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N0UsOENBQThDO0FBQzlDLDhFQUE4RTtBQUM5RSxVQUFVO0FBQ1YsTUFBTUMsV0FDSkMsS0FBSzNFLFFBQVE0RSxRQUFRLEtBQUssVUFBVUQsRUFBRXpCLE9BQU8sQ0FBQyxPQUFPLFFBQVF5QjtBQUMvRCxNQUFNRSxpQkFDSkYsS0FBSzNFLFFBQVE0RSxRQUFRLEtBQUssVUFBVUQsRUFBRXpCLE9BQU8sQ0FBQyxPQUFPLE9BQU95QjtBQUM5RCxNQUFNdkIsV0FDSixDQUFDMEIsR0FBR0MsSUFBTUYsZUFBZVQsS0FBS1ksSUFBSSxDQUFDTixTQUFTSSxJQUFJSixTQUFTSztBQUMzRCxNQUFNMUIsY0FDSnNCLEtBQUtFLGVBQWVULEtBQUthLE9BQU8sQ0FBQ1AsU0FBU0M7QUFDNUMsTUFBTUosZUFDSixDQUFDVyxJQUFJQyxLQUFPTixlQUFlVCxLQUFLZ0IsUUFBUSxDQUFDVixTQUFTUSxLQUFLUixTQUFTUyIsImZpbGUiOiIvcGFja2FnZXMvbWluaWZpZXItY3NzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgcG9zdGNzcyBmcm9tICdwb3N0Y3NzJztcbmltcG9ydCBjc3NuYW5vIGZyb20gJ2Nzc25hbm8nO1xuXG5jb25zdCBDc3NUb29scyA9IHtcbiAgLyoqXG4gICAqIFBhcnNlIHRoZSBpbmNvbWluZyBDU1Mgc3RyaW5nOyByZXR1cm4gYSBDU1MgQVNULlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzVGV4dCBUaGUgQ1NTIHN0cmluZyB0byBiZSBwYXJzZWQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE9wdGlvbnMgdG8gcGFzcyB0byB0aGUgUG9zdENTUyBwYXJzZXIuXG4gICAqIEByZXR1cm4ge3Bvc3Rjc3MjUm9vdH0gUG9zdENTUyBSb290IEFTVC5cbiAgICovXG4gIHBhcnNlQ3NzKGNzc1RleHQsIG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIFRoaXMgZnVuY3Rpb24gcHJldmlvdXNseSB1c2VkIHRoZSBgY3NzLXBhcnNlYCBucG0gcGFja2FnZSwgd2hpY2hcbiAgICAvLyBzZXQgdGhlIG5hbWUgb2YgdGhlIGNzcyBmaWxlIGJlaW5nIHBhcnNlZCB1c2luZyAgeyBzb3VyY2U6ICdmaWxlbmFtZScgfS5cbiAgICAvLyBJZiBpbmNsdWRlZCwgd2UnbGwgY29udmVydCB0aGlzIHRvIHRoZSBgcG9zdGNzc2AgZXF1aXZhbGVudCwgdG8gbWFpbnRhaW5cbiAgICAvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgICBpZiAob3B0aW9ucy5zb3VyY2UpIHtcbiAgICAgIG9wdGlvbnMuZnJvbSA9IG9wdGlvbnMuc291cmNlO1xuICAgICAgZGVsZXRlIG9wdGlvbnMuc291cmNlO1xuICAgIH1cbiAgICByZXR1cm4gcG9zdGNzcy5wYXJzZShjc3NUZXh0LCBvcHRpb25zKTtcbiAgfSxcblxuICAvKipcbiAgICogVXNpbmcgdGhlIGluY29taW5nIENTUyBBU1QsIGNyZWF0ZSBhbmQgcmV0dXJuIGEgbmV3IG9iamVjdCB3aXRoIHRoZVxuICAgKiBnZW5lcmF0ZWQgQ1NTIHN0cmluZywgYW5kIG9wdGlvbmFsIHNvdXJjZW1hcCBkZXRhaWxzLlxuICAgKlxuICAgKiBAcGFyYW0ge3Bvc3Rjc3MjUm9vdH0gY3NzQXN0IFBvc3RDU1MgUm9vdCBBU1QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE9wdGlvbnMgdG8gcGFzcyB0byB0aGUgUG9zdENTUyBwYXJzZXIuXG4gICAqIEByZXR1cm4ge09iamVjdH0gRm9ybWF0OiB7IGNvZGU6ICdjc3Mgc3RyaW5nJywgbWFwOiAnc291cmNlbWFwIGRlYXRpbHMnIH0uXG4gICAqL1xuICBzdHJpbmdpZnlDc3MoY3NzQXN0LCBvcHRpb25zID0ge30pIHtcbiAgICAvLyBUaGlzIGZ1bmN0aW9uIHByZXZpb3VzbHkgdXNlZCB0aGUgYGNzcy1zdHJpbmdpZnlgIG5wbSBwYWNrYWdlLCB3aGljaFxuICAgIC8vIGNvbnRyb2xsZWQgc291cmNlbWFwIGdlbmVyYXRpb24gYnkgcGFzc2luZyBpbiB7IHNvdXJjZW1hcDogdHJ1ZSB9LlxuICAgIC8vIElmIGluY2x1ZGVkLCB3ZSdsbCBjb252ZXJ0IHRoaXMgdG8gdGhlIGBwb3N0Y3NzYCBlcXVpdmFsZW50LCB0byBtYWludGFpblxuICAgIC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuICAgIGlmIChvcHRpb25zLnNvdXJjZW1hcCkge1xuICAgICAgb3B0aW9ucy5tYXAgPSB7XG4gICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgIGFubm90YXRpb246IGZhbHNlLFxuICAgICAgICBzb3VyY2VzQ29udGVudDogZmFsc2UsXG4gICAgICB9O1xuICAgICAgZGVsZXRlIG9wdGlvbnMuc291cmNlbWFwO1xuICAgIH1cbiAgICAvLyBleHBsaWNpdGx5IHNldCBmcm9tIHRvIHVuZGVmaW5lZCB0byBwcmV2ZW50IHBvc3Rjc3Mgd2FybmluZ3NcbiAgICBpZiAoIW9wdGlvbnMuZnJvbSl7XG4gICAgICBvcHRpb25zLmZyb20gPSB2b2lkIDA7XG4gICAgfVxuXG4gICAgdHJhbnNmb3JtUmVzdWx0ID0gY3NzQXN0LnRvUmVzdWx0KG9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6IHRyYW5zZm9ybVJlc3VsdC5jc3MsXG4gICAgICBtYXA6IHRyYW5zZm9ybVJlc3VsdC5tYXAgPyB0cmFuc2Zvcm1SZXN1bHQubWFwLnRvSlNPTigpIDogbnVsbCxcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBNaW5pZnkgdGhlIHBhc3NlZCBpbiBDU1Mgc3RyaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzVGV4dCBDU1Mgc3RyaW5nIHRvIG1pbmlmeS5cbiAgICogQHJldHVybiB7UHJvbWlzZTxTdHJpbmdbXT59IEFycmF5IGNvbnRhaW5pbmcgdGhlIG1pbmlmaWVkIENTUy5cbiAgICovXG4gIG1pbmlmeUNzcyhjc3NUZXh0KSB7XG4gICAgcmV0dXJuIENzc1Rvb2xzLm1pbmlmeUNzc0FzeW5jKGNzc1RleHQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBNaW5pZnkgdGhlIHBhc3NlZCBpbiBDU1Mgc3RyaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzVGV4dCBDU1Mgc3RyaW5nIHRvIG1pbmlmeS5cbiAgICogQHJldHVybiB7UHJvbWlzZTxTdHJpbmdbXT59IEFycmF5IGNvbnRhaW5pbmcgdGhlIG1pbmlmaWVkIENTUy5cbiAgICovXG4gIGFzeW5jIG1pbmlmeUNzc0FzeW5jKGNzc1RleHQpIHtcbiAgICByZXR1cm4gYXdhaXQgcG9zdGNzcyhbY3NzbmFubyh7IHNhZmU6IHRydWUgfSldKVxuICAgICAgLnByb2Nlc3MoY3NzVGV4dCwge1xuICAgICAgICBmcm9tOiB2b2lkIDAsXG4gICAgICB9KVxuICAgICAgLnRoZW4oKHJlc3VsdCkgPT4gW3Jlc3VsdC5jc3NdKTtcbiAgfSxcblxuICAvKipcbiAgICogTWVyZ2UgbXVsdGlwbGUgQ1NTIEFTVCdzIGludG8gb25lLlxuICAgKlxuICAgKiBAcGFyYW0ge3Bvc3Rjc3MjUm9vdFtdfSBjc3NBc3RzIEFycmF5IG9mIFBvc3RDU1MgUm9vdCBvYmplY3RzLlxuICAgKiBAY2FsbGJhY2sgd2FybkNiIENhbGxiYWNrIHVzZWQgdG8gaGFuZGxlIHdhcm5pbmcgbWVzc2FnZXMuXG4gICAqIEByZXR1cm4ge3Bvc3Rjc3MjUm9vdH0gUG9zdENTUyBSb290IG9iamVjdC5cbiAgICovXG4gIG1lcmdlQ3NzQXN0cyhjc3NBc3RzLCB3YXJuQ2IpIHtcbiAgICBjb25zdCBydWxlc1ByZWRpY2F0ZSA9IChydWxlcywgZXhjbHVkZSA9IGZhbHNlKSA9PiB7XG4gICAgICBpZiAoISBBcnJheS5pc0FycmF5KHJ1bGVzKSkge1xuICAgICAgICBydWxlcyA9IFtydWxlc107XG4gICAgICB9XG4gICAgICByZXR1cm4gbm9kZSA9PiB7XG4gICAgICAgIC8vIFBvc3RDU1MgQXRSdWxlIG5vZGVzIGhhdmUgYHR5cGU6ICdhdHJ1bGUnYCBhbmQgYSBkZXNjcmlwdGl2ZSBuYW1lLFxuICAgICAgICAvLyBlLmcuICdpbXBvcnQnIG9yICdjaGFyc2V0Jywgd2hpbGUgQ29tbWVudCBub2RlcyBoYXZlIHR5cGUgb25seS5cbiAgICAgICAgY29uc3Qgbm9kZU1hdGNoZXNSdWxlID0gcnVsZXMuaW5jbHVkZXMobm9kZS5uYW1lIHx8IG5vZGUudHlwZSk7XG5cbiAgICAgICAgcmV0dXJuIGV4Y2x1ZGUgPyAhbm9kZU1hdGNoZXNSdWxlIDogbm9kZU1hdGNoZXNSdWxlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBTaW1wbGUgY29uY2F0ZW5hdGlvbiBvZiBDU1MgZmlsZXMgd291bGQgYnJlYWsgQGltcG9ydCBydWxlc1xuICAgIC8vIGxvY2F0ZWQgaW4gdGhlIGJlZ2lubmluZyBvZiBhIGZpbGUuIEJlZm9yZSBjb25jYXRlbmF0aW9uLCBwdWxsXG4gICAgLy8gQGltcG9ydCBydWxlcyB0byB0aGUgYmVnaW5uaW5nIG9mIGEgbmV3IHN5bnRheCB0cmVlIHNvIHRoZXkgYWx3YXlzXG4gICAgLy8gcHJlY2VkZSBvdGhlciBydWxlcy5cbiAgICBjb25zdCBuZXdBc3QgPSBwb3N0Y3NzLnJvb3QoKTtcblxuICAgIGNzc0FzdHMuZm9yRWFjaCgoYXN0KSA9PiB7XG4gICAgICBpZiAoYXN0Lm5vZGVzKSB7XG4gICAgICAgIC8vIFBpY2sgb25seSB0aGUgaW1wb3J0cyBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgZmlsZSBpZ25vcmluZyBAY2hhcnNldFxuICAgICAgICAvLyBydWxlcyBhcyBldmVyeSBmaWxlIGlzIGFzc3VtZWQgdG8gYmUgaW4gVVRGLTguXG4gICAgICAgIGNvbnN0IGNoYXJzZXRSdWxlcyA9IGFzdC5ub2Rlcy5maWx0ZXIocnVsZXNQcmVkaWNhdGUoJ2NoYXJzZXQnKSk7XG5cbiAgICAgICAgaWYgKGNoYXJzZXRSdWxlcy5zb21lKChydWxlKSA9PiB7XG4gICAgICAgICAgLy8gQWNjb3JkaW5nIHRvIE1ETiwgb25seSAnVVRGLTgnIGFuZCBcIlVURi04XCIgYXJlIHRoZSBjb3JyZWN0XG4gICAgICAgICAgLy8gZW5jb2RpbmcgZGlyZWN0aXZlcyByZXByZXNlbnRpbmcgVVRGLTguXG4gICAgICAgICAgcmV0dXJuICEgL14oWydcIl0pVVRGLThcXDEkLy50ZXN0KHJ1bGUucGFyYW1zKTtcbiAgICAgICAgfSkpIHtcbiAgICAgICAgICB3YXJuQ2IoXG4gICAgICAgICAgICBhc3QuZmlsZW5hbWUsXG4gICAgICAgICAgICAnQGNoYXJzZXQgcnVsZXMgaW4gdGhpcyBmaWxlIHdpbGwgYmUgaWdub3JlZCBhcyBVVEYtOCBpcyB0aGUgJyArXG4gICAgICAgICAgICAnb25seSBlbmNvZGluZyBzdXBwb3J0ZWQnXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFzdC5ub2RlcyA9IGFzdC5ub2Rlcy5maWx0ZXIocnVsZXNQcmVkaWNhdGUoJ2NoYXJzZXQnLCB0cnVlKSk7XG4gICAgICAgIGxldCBpbXBvcnRDb3VudCA9IDA7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0Lm5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKCEgcnVsZXNQcmVkaWNhdGUoWydpbXBvcnQnLCAnY29tbWVudCddKShhc3Qubm9kZXNbaV0pKSB7XG4gICAgICAgICAgICBpbXBvcnRDb3VudCA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBDc3NUb29scy5yZXdyaXRlQ3NzVXJscyhhc3QpO1xuXG4gICAgICAgIGNvbnN0IGltcG9ydHMgPSBhc3Qubm9kZXMuc3BsaWNlKDAsIGltcG9ydENvdW50KTtcbiAgICAgICAgbmV3QXN0Lm5vZGVzLnB1c2goLi4uaW1wb3J0cyk7XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIGltcG9ydHMgbGVmdCBpbiB0aGUgbWlkZGxlIG9mIGEgZmlsZSwgd2FybiB1c2VycyBhcyBpdFxuICAgICAgICAvLyBtaWdodCBiZSBhIHBvdGVudGlhbCBidWcgKGltcG9ydHMgYXJlIG9ubHkgdmFsaWQgYXQgdGhlIGJlZ2lubmluZyBvZlxuICAgICAgICAvLyBhIGZpbGUpLlxuICAgICAgICBpZiAoYXN0Lm5vZGVzLnNvbWUocnVsZXNQcmVkaWNhdGUoJ2ltcG9ydCcpKSkge1xuICAgICAgICAgIHdhcm5DYihcbiAgICAgICAgICAgIGFzdC5maWxlbmFtZSxcbiAgICAgICAgICAgICdUaGVyZSBhcmUgc29tZSBAaW1wb3J0IHJ1bGVzIGluIHRoZSBtaWRkbGUgb2YgYSBmaWxlLiBUaGlzICcgK1xuICAgICAgICAgICAgJ21pZ2h0IGJlIGEgYnVnLCBhcyBpbXBvcnRzIGFyZSBvbmx5IHZhbGlkIGF0IHRoZSBiZWdpbm5pbmcgb2YgJyArXG4gICAgICAgICAgICAnYSBmaWxlLidcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBOb3cgd2UgY2FuIHB1dCB0aGUgcmVzdCBvZiBDU1MgcnVsZXMgaW50byBuZXcgQVNULlxuICAgIGNzc0FzdHMuZm9yRWFjaCgoYXN0KSA9PiB7XG4gICAgICBpZiAoYXN0Lm5vZGVzKSB7XG4gICAgICAgIG5ld0FzdC5ub2Rlcy5wdXNoKC4uLmFzdC5ub2Rlcyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3QXN0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBXZSBhcmUgbG9va2luZyBmb3IgYWxsIHJlbGF0aXZlIHVybHMgZGVmaW5lZCB3aXRoIHRoZSBgdXJsKClgIGZ1bmN0aW9uYWxcbiAgICogbm90YXRpb24gYW5kIHJld3JpdGluZyB0aGVtIHRvIHRoZSBlcXVpdmFsZW50IGFic29sdXRlIHVybCB1c2luZyB0aGVcbiAgICogYHNvdXJjZWAgcGF0aCBwcm92aWRlZCBieSBwb3N0Y3NzLiBGb3IgcGVyZm9ybWFuY2UgcmVhc29ucyB0aGlzIGZ1bmN0aW9uXG4gICAqIGFjdHMgYnkgc2lkZSBlZmZlY3QgYnkgbW9kaWZ5aW5nIHRoZSBnaXZlbiBBU1Qgd2l0aG91dCBkb2luZyBhIGRlZXAgY29weS5cbiAgICpcbiAgICogQHBhcmFtIHtwb3N0Y3NzI1Jvb3R9IGFzdCBQb3N0Q1NTIFJvb3Qgb2JqZWN0LlxuICAgKiBAcmV0dXJuIE1vZGlmaWVzIHRoZSBhc3QgcGFyYW0gaW4gcGxhY2UuXG4gICAqL1xuICByZXdyaXRlQ3NzVXJscyhhc3QpIHtcbiAgICBjb25zdCBtZXJnZWRDc3NQYXRoID0gJy8nO1xuICAgIHJld3JpdGVSdWxlcyhhc3Qubm9kZXMsIG1lcmdlZENzc1BhdGgpO1xuICB9XG59O1xuXG5pZiAodHlwZW9mIFByb2ZpbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gIFtcbiAgICAncGFyc2VDc3MnLFxuICAgICdzdHJpbmdpZnlDc3MnLFxuICAgICdtaW5pZnlDc3MnLFxuICAgICdtaW5pZnlDc3NBc3luYycsXG4gICAgJ21lcmdlQ3NzQXN0cycsXG4gICAgJ3Jld3JpdGVDc3NVcmxzJyxcbiAgXS5mb3JFYWNoKGZ1bmNOYW1lID0+IHtcbiAgICBDc3NUb29sc1tmdW5jTmFtZV0gPSBQcm9maWxlKGBDc3NUb29scy4ke2Z1bmNOYW1lfWAsIENzc1Rvb2xzW2Z1bmNOYW1lXSk7XG4gIH0pO1xufVxuXG5leHBvcnQgeyBDc3NUb29scyB9O1xuXG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5jb25zdCByZXdyaXRlUnVsZXMgPSAocnVsZXMsIG1lcmdlZENzc1BhdGgpID0+IHtcbiAgcnVsZXMuZm9yRWFjaCgocnVsZSkgPT4ge1xuICAgIC8vIFJlY3Vyc2UgaWYgdGhlcmUgYXJlIHN1Yi1ydWxlcy4gQW4gZXhhbXBsZTpcbiAgICAvLyAgICAgQG1lZGlhICguLi4pIHtcbiAgICAvLyAgICAgICAgIC5ydWxlIHsgdXJsKC4uLik7IH1cbiAgICAvLyAgICAgfVxuICAgIGlmIChoYXNPd24uY2FsbChydWxlLCAnbm9kZXMnKSkge1xuICAgICAgcmV3cml0ZVJ1bGVzKHJ1bGUubm9kZXMsIG1lcmdlZENzc1BhdGgpO1xuICAgIH1cblxuICAgIGNvbnN0IGFwcERpciA9IHByb2Nlc3MuY3dkKCk7XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IHJ1bGUuc291cmNlLmlucHV0LmZpbGU7XG4gICAgY29uc3Qgc291cmNlRmlsZUZyb21BcHBSb290ID1cbiAgICAgIHNvdXJjZUZpbGUgPyBzb3VyY2VGaWxlLnJlcGxhY2UoYXBwRGlyLCAnJykgOiAnJztcbiAgICBsZXQgYmFzZVBhdGggPSBwYXRoSm9pbignLycsIHBhdGhEaXJuYW1lKHNvdXJjZUZpbGVGcm9tQXBwUm9vdCkpO1xuXG4gICAgLy8gU2V0IHRoZSBjb3JyZWN0IGJhc2VQYXRoIGJhc2VkIG9uIGhvdyB0aGUgbGlua2VkIGFzc2V0IHdpbGwgYmUgc2VydmVkLlxuICAgIC8vIFhYWCBUaGlzIGlzIHdyb25nLiBXZSBhcmUgY291cGxpbmcgdGhlIGluZm9ybWF0aW9uIGFib3V0IGhvdyBmaWxlcyB3aWxsXG4gICAgLy8gYmUgc2VydmVkIGJ5IHRoZSB3ZWIgc2VydmVyIHRvIHRoZSBpbmZvcm1hdGlvbiBob3cgdGhleSB3ZXJlIHN0b3JlZFxuICAgIC8vIG9yaWdpbmFsbHkgb24gdGhlIGZpbGVzeXN0ZW0gaW4gdGhlIHByb2plY3Qgc3RydWN0dXJlLiBJZGVhbGx5LCB0aGVyZVxuICAgIC8vIHNob3VsZCBiZSBzb21lIG1vZHVsZSB0aGF0IHRlbGxzIHVzIHByZWNpc2VseSBob3cgZWFjaCBhc3NldCB3aWxsIGJlXG4gICAgLy8gc2VydmVkIGJ1dCBmb3Igbm93IHdlIGFyZSBqdXN0IGFzc3VtaW5nIHRoYXQgZXZlcnl0aGluZyB0aGF0IGNvbWVzIGZyb21cbiAgICAvLyBhIGZvbGRlciBzdGFydGluZyB3aXRoIFwiL3BhY2thZ2VzL1wiIGlzIHNlcnZlZCBvbiB0aGUgc2FtZSBwYXRoIGFzXG4gICAgLy8gaXQgd2FzIG9uIHRoZSBmaWxlc3lzdGVtIGFuZCBldmVyeXRoaW5nIGVsc2UgaXMgc2VydmVkIG9uIHJvb3QgXCIvXCIuXG4gICAgaWYgKCEgYmFzZVBhdGgubWF0Y2goL15cXC8/cGFja2FnZXNcXC8vaSkpIHtcbiAgICAgIGJhc2VQYXRoID0gXCIvXCI7XG4gICAgfVxuXG4gICAgbGV0IHZhbHVlID0gcnVsZS52YWx1ZTtcblxuICAgIC8vIE1hdGNoIGNzcyB2YWx1ZXMgY29udGFpbmluZyBzb21lIGZ1bmN0aW9uYWwgY2FsbHMgdG8gYHVybChVUkkpYCB3aGVyZVxuICAgIC8vIFVSSSBpcyBvcHRpb25hbGx5IHF1b3RlZC5cbiAgICAvLyBOb3RlIHRoYXQgYSBjc3MgdmFsdWUgY2FuIGNvbnRhaW5zIG90aGVyIGVsZW1lbnRzLCBmb3IgaW5zdGFuY2U6XG4gICAgLy8gICBiYWNrZ3JvdW5kOiB0b3AgY2VudGVyIHVybChcImJhY2tncm91bmQucG5nXCIpIGJsYWNrO1xuICAgIC8vIG9yIGV2ZW4gbXVsdGlwbGUgdXJsKCksIGZvciBpbnN0YW5jZSBmb3IgbXVsdGlwbGUgYmFja2dyb3VuZHMuXG4gICAgdmFyIGNzc1VybFJlZ2V4ID0gL3VybFxccypcXChcXHMqKFsnXCJdPykoLis/KVxcMVxccypcXCkvZ2k7XG4gICAgbGV0IHBhcnRzO1xuICAgIHdoaWxlIChwYXJ0cyA9IGNzc1VybFJlZ2V4LmV4ZWModmFsdWUpKSB7XG4gICAgICBjb25zdCBvbGRDc3NVcmwgPSBwYXJ0c1swXTtcbiAgICAgIGNvbnN0IHF1b3RlID0gcGFydHNbMV07XG4gICAgICBjb25zdCByZXNvdXJjZSA9IHVybC5wYXJzZShwYXJ0c1syXSk7XG5cbiAgICAgIC8vIFdlIGRvbid0IHJld3JpdGUgVVJMcyBzdGFydGluZyB3aXRoIGEgcHJvdG9jb2wgZGVmaW5pdGlvbiBzdWNoIGFzXG4gICAgICAvLyBodHRwLCBodHRwcywgb3IgZGF0YSwgb3IgdGhvc2Ugd2l0aCBuZXR3b3JrLXBhdGggcmVmZXJlbmNlc1xuICAgICAgLy8gaS5lLiAvL2ltZy5kb21haW4uY29tL2NhdC5naWZcbiAgICAgIGlmIChyZXNvdXJjZS5wcm90b2NvbCAhPT0gbnVsbCB8fFxuICAgICAgICAgIHJlc291cmNlLmhyZWYuc3RhcnRzV2l0aCgnLy8nKSB8fFxuICAgICAgICAgIHJlc291cmNlLmhyZWYuc3RhcnRzV2l0aCgnIycpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXdyaXRlIHJlbGF0aXZlIHBhdGhzICh0aGF0IHJlZmVycyB0byB0aGUgaW50ZXJuYWwgYXBwbGljYXRpb24gdHJlZSlcbiAgICAgIC8vIHRvIGFic29sdXRlIHBhdGhzIChhZGRyZXNzYWJsZSBmcm9tIHRoZSBwdWJsaWMgYnVpbGQpLlxuICAgICAgbGV0IGFic29sdXRlUGF0aCA9IGlzUmVsYXRpdmUocmVzb3VyY2UucGF0aClcbiAgICAgICAgPyBwYXRoSm9pbihiYXNlUGF0aCwgcmVzb3VyY2UucGF0aClcbiAgICAgICAgOiByZXNvdXJjZS5wYXRoO1xuXG4gICAgICBpZiAocmVzb3VyY2UuaGFzaCkge1xuICAgICAgICBhYnNvbHV0ZVBhdGggKz0gcmVzb3VyY2UuaGFzaDtcbiAgICAgIH1cblxuICAgICAgLy8gV2UgdXNlZCB0byBmaW5pc2ggdGhlIHJld3JpdGluZyBwcm9jZXNzIGF0IHRoZSBhYnNvbHV0ZSBwYXRoIHN0ZXBcbiAgICAgIC8vIGFib3ZlLiBCdXQgaXQgZGlkbid0IHdvcmsgaW4gY2FzZSB0aGUgTWV0ZW9yIGFwcGxpY2F0aW9uIHdhcyBkZXBsb3llZFxuICAgICAgLy8gdW5kZXIgYSBzdWItcGF0aCAoZWcgYFJPT1RfVVJMPWh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9teWFwcCBtZXRlb3JgKVxuICAgICAgLy8gaW4gd2hpY2ggY2FzZSB0aGUgcmVzb3VyY2VzIGxpbmtlZCBpbiB0aGUgbWVyZ2VkIENTUyBmaWxlIHdvdWxkIG1pc3NcbiAgICAgIC8vIHRoZSBgbXlhcHAvYCBwcmVmaXguIFNpbmNlIHRoaXMgcGF0aCBwcmVmaXggaXMgb25seSBrbm93biBhdCBsYXVuY2hcbiAgICAgIC8vIHRpbWUgKHJhdGhlciB0aGFuIGJ1aWxkIHRpbWUpIHdlIGNhbid0IHVzZSBhYnNvbHV0ZSBwYXRocyB0byBsaW5rXG4gICAgICAvLyByZXNvdXJjZXMgaW4gdGhlIGdlbmVyYXRlZCBDU1MuXG4gICAgICAvL1xuICAgICAgLy8gSW5zdGVhZCB3ZSB0cmFuc2Zvcm0gYWJzb2x1dGUgcGF0aHMgdG8gbWFrZSB0aGVtIHJlbGF0aXZlIHRvIHRoZVxuICAgICAgLy8gbWVyZ2VkIENTUywgbGVhdmluZyB0byB0aGUgYnJvd3NlciB0aGUgcmVzcG9uc2liaWxpdHkgdG8gY2FsY3VsYXRlXG4gICAgICAvLyB0aGUgZmluYWwgcmVzb3VyY2UgbGlua3MgKGJ5IGFkZGluZyB0aGUgYXBwbGljYXRpb24gZGVwbG95bWVudFxuICAgICAgLy8gcHJlZml4LCBoZXJlIGBteWFwcC9gLCBpZiBhcHBsaWNhYmxlKS5cbiAgICAgIGNvbnN0IHJlbGF0aXZlVG9NZXJnZWRDc3MgPSBwYXRoUmVsYXRpdmUobWVyZ2VkQ3NzUGF0aCwgYWJzb2x1dGVQYXRoKTtcbiAgICAgIGNvbnN0IG5ld0Nzc1VybCA9IGB1cmwoJHtxdW90ZX0ke3JlbGF0aXZlVG9NZXJnZWRDc3N9JHtxdW90ZX0pYDtcbiAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZShvbGRDc3NVcmwsIG5ld0Nzc1VybCk7XG4gICAgfVxuXG4gICAgcnVsZS52YWx1ZSA9IHZhbHVlO1xuICB9KTtcbn07XG5cbmNvbnN0IGlzUmVsYXRpdmUgPSBwYXRoID0+IHBhdGggJiYgcGF0aC5jaGFyQXQoMCkgIT09ICcvJztcblxuLy8gVGhlc2UgYXJlIGR1cGxpY2F0ZXMgb2YgZnVuY3Rpb25zIGluIHRvb2xzL2ZpbGVzLmpzLCBiZWNhdXNlIHdlIGRvbid0IGhhdmVcbi8vIGEgZ29vZCB3YXkgb2YgZXhwb3J0aW5nIHRoZW0gaW50byBwYWNrYWdlcy5cbi8vIFhYWCBkZWR1cGxpY2F0ZSBmaWxlcy5qcyBpbnRvIGEgcGFja2FnZSBhdCBzb21lIHBvaW50IHNvIHRoYXQgd2UgY2FuIHVzZSBpdFxuLy8gaW4gY29yZVxuY29uc3QgdG9PU1BhdGggPVxuICBwID0+IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicgPyBwLnJlcGxhY2UoL1xcLy9nLCAnXFxcXCcpIDogcDtcbmNvbnN0IHRvU3RhbmRhcmRQYXRoID1cbiAgcCA9PiBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInID8gcC5yZXBsYWNlKC9cXFxcL2csICcvJykgOiBwO1xuY29uc3QgcGF0aEpvaW4gPVxuICAoYSwgYikgPT4gdG9TdGFuZGFyZFBhdGgocGF0aC5qb2luKHRvT1NQYXRoKGEpLCB0b09TUGF0aChiKSkpO1xuY29uc3QgcGF0aERpcm5hbWUgPVxuICBwID0+IHRvU3RhbmRhcmRQYXRoKHBhdGguZGlybmFtZSh0b09TUGF0aChwKSkpO1xuY29uc3QgcGF0aFJlbGF0aXZlID1cbiAgKHAxLCBwMikgPT4gdG9TdGFuZGFyZFBhdGgocGF0aC5yZWxhdGl2ZSh0b09TUGF0aChwMSksIHRvT1NQYXRoKHAyKSkpO1xuIl19
