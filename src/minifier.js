const md5 = require('md5');

function escapeRegExp(string)
{
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function padWithZeroes(number, length = 2)
{
    var string = ''+number;

    while (string.length < length)
    {
        string = '0'+string;
    }

    return string;

}

minifyHandlebarsTemplateRegexForeachNum = 0;

function minifyHandlebarsTemplateRegexForeach(template, regexs, callback, full = false)
{
	let matches = [];
	let haveMatches = true;

	while(haveMatches)
	{
		haveMatches = false;

		for(let i in regexs)
		{
			let regex = regexs[i];
			let matchKey = 1;

			if(Array.isArray(regex))
			{
				matchKey = regex[1];
				regex = regex[0];
			}

			if(regex.test(template))
			{
				let key = md5(Math.random())+padWithZeroes(minifyHandlebarsTemplateRegexForeachNum++, 10);

				let match = template.match(regex);
				template = template.replace(regex, key);

				matches.push({
					key: key,
					match: match,
					matchKey: matchKey,
				});

				haveMatches = true;
			}
		}
	}

	matches.reverse();

	for(let i in matches)
	{
		if(full)
		{
			let minify = callback(matches[i].match[0]);

			template = template.replace(new RegExp(escapeRegExp(matches[i].key)), minify);
		}
		else
		{
			let minify = callback(matches[i].match[matches[i].matchKey]);

			minify = matches[i].match[0].replace(new RegExp(escapeRegExp(matches[i].match[matches[i].matchKey])), minify)

			template = template.replace(new RegExp(escapeRegExp(matches[i].key)), minify);
		}
	}

	return template;

}

function minifyHandlebarsTemplateOutsideRegexForeach(template, regexs, callback)
{
	let matches = [];
	let haveMatches = true;

	while(haveMatches)
	{
		haveMatches = false;

		for(let i in regexs)
		{
			let regex = regexs[i];
			let matchKey = 1;

			if(Array.isArray(regex))
			{
				matchKey = regex[1];
				regex = regex[0];
			}

			if(regex.test(template))
			{
				let key = md5(Math.random())+padWithZeroes(minifyHandlebarsTemplateRegexForeachNum++, 10);

				let match = template.match(regex);
				template = template.replace(regex, key);

				matches.push({
					key: key,
					match: match,
					matchKey: matchKey,
				});

				haveMatches = true;
			}
		}
	}

	template = callback(template);

	matches.reverse();

	for(let i in matches)
	{
		template = template.replace(new RegExp(escapeRegExp(matches[i].key)), matches[i].match[0]);
	}

	return template;

}

function canCollapseWhitespace(tag)
{
  return !/^(?:script|style|pre|textarea)$/.test(tag);
}

function safeCollapseWhiteSpace(template, options)
{
	template = template.replace(/\s+/g, ' ');

	return template;
}

// Minify JS safe handlebars
function minifyJS(template, options)
{
	template = minifyHandlebarsTemplateRegexForeach(template, [
		/\son[a-z]*="([^"]+)"/,
		/\soff="([^"]+)"/,
		[/\<script(\s[^\>]*)?\>([^<]*)\<\/script(\s[^\>]*)?\>/, 2]
	], function(js) {

		return minifyHandlebarsTemplateOutsideRegexForeach(js, [
			/"[^"\\\\]*(?:\\\\.[^"\\\\]*)*"/s,
			/'[^'\\\\]*(?:\\\\.[^'\\\\]*)*'/s,
		], function(js) {

			// Remove JS comments
			js = js.replace(/\/\/[^\n]*/ig, '');
			js = js.replace(/\/\*[\s\S]*?(\*\/|$)/ig, '');

			if(options.safeCollapseWhiteSpace)
				js = safeCollapseWhiteSpace(js, options);

			js = js.replace(/,\s+/ig, ',');
			js = js.replace(/:\s+/ig, ':');
			js = js.replace(/true/ig, '!0');
			js = js.replace(/false/ig, '!1');
			js = js.replace(/([0-9()]|vw|vh|px|%)\s*([\.\-\+\*\/])/ig, '$1$2');
			js = js.replace(/([\.\-\+\*\/])\s*([0-9()])/ig, '$1$2');

			return js.trim();

		});

	}, false);

	return template;
}

// Minify CSS safe handlebars
function minifyCSS(template, options)
{
	template = minifyHandlebarsTemplateRegexForeach(template, [
		/\sstyle="([^"]+)"/,
		[/\<style(\s[^\>]*)?\>([^<]*)\<\/style(\s[^\>]*)?\>/, 2]
	], function(css) {

		// Remove CSS comments
		css = css.replace(/\/\*[\s\S]*?(\*\/|$)/ig, '');

		if(options.safeCollapseWhiteSpace)
			css = safeCollapseWhiteSpace(css, options);

		css = css.replace(/([^{}])\s*([{}])\s*([^{}])/ig, '$1$2$3');
		css = css.replace(/\s*,\s*/ig, ',');
		css = css.replace(/\s*:\s*/ig, ':');
		css = css.replace(/([0-9()]|vw|vh|px|%)\s*([\.\*\/])/ig, '$1$2');
		css = css.replace(/([\.\*\/])\s*([0-9()])/ig, '$1$2');
		
		/*css = minifyHandlebarsTemplateOutsideRegexForeach(css, [
			/calc(\((?>[^()]+|(?1))*\))/i,
		], function(css) {

			css = css.replace(/([^0-9])0px/ig, '$10');

			return css;

		});*/
		
		css = css.replace(/([^0-9])0\./ig, '$1.');
		css = css.replace(/\s*>\s*/ig, '>');

		return css.trim();

	}, false);

	return template;
}

// Remove Attr Quotes
function removeAttrQuotes(template, options)
{
	template = minifyHandlebarsTemplateRegexForeach(template, [
		/([a-z])=\"([^"\s]*)\"/,
	], function(attr) {

		if(!/{{.+}}/.test(attr))
			attr = attr.replace(/([a-z])=\"([^{][^"\s]*[^}])\"/ig, '$1=$2');

		return attr;

	}, true);

	if(!options.removeAttrQuotesSafe)
	{
		template = minifyHandlebarsTemplateRegexForeach(template, [
			/\son[a-z]*="([^"\s]*)"/,
			/\soff="([^"\s]*)"/,
			/\sstyle="([^"\s]*)"/,
		], function(attr) {

			if(!/['"]{{.+}}['"]/.test(attr) && !/{{.+}}[^()]*['"]/.test(attr) && !/['"][^()]*{{.+}}/.test(attr))
				attr = attr.replace(/([a-z])=\"([^{][^"\s]*[^}])\"/ig, '$1=$2');

			return attr;

		}, false);
	}

	return template;
}

var defaultOptions = {
	safeCollapseWhiteSpace: true,
	minifyJS: true,
	minifyCSS: true,
	removeScriptTypeAttributes: true,
	removeStyleLinkTypeAttributes: true,
	removeAttrQuotes: true,
	removeAttrQuotesSafe: true,
};

function minifyHandlebarsTemplate(template, options = {})
{
	options = {...defaultOptions, ...options};

	// Minify JS safe handlebars
	if(options.minifyJS)
		template = minifyJS(template, options);

	// Minify CSS safe handlebars
	if(options.minifyCSS)
		template = minifyCSS(template, options);

	// Remove end semicolon (CSS and HTML)
	if(options.minifyCSS)
		template = template.replace(/([^}]);\s*(["}])/ig, '$1$2');
	else
		template = template.replace(/([^}]);\s*(["])/ig, '$1$2');

	// Remove multiples white space to one space
	if(options.safeCollapseWhiteSpace)
		template = safeCollapseWhiteSpace(template, options);

	// Remove spaces in semicolon
	template = template.replace(/\s*;\s*/g, ';');

	// Remove type="text/css" and type="text/javascript"
	if(options.removeScriptTypeAttributes)
		template = template.replace(/\s*type="text\/javascript"(\s+(\>))?/ig, '$2');

	if(options.removeStyleLinkTypeAttributes)
		template = template.replace(/\s*type="text\/css"(\s+(\>))?/ig, '$2');

	// Remove Attr Quotes
	if(options.removeAttrQuotes)
		template = removeAttrQuotes(template, options);

	// Remove HTML Comments
	template = template.replace(/\<!--[\S\s]*?[^\/]{2}--\>/ig, '');

	// Remove the space between html elements keeping one space (safe mode)
	if(options.safeCollapseWhiteSpace)
	{
		template = minifyHandlebarsTemplateRegexForeach(template, [
			[/(\s+\<\/[a-z]+(\s[^\>]*)?\>|\<\/[a-z]+(\s[^\>]*)?\>\s+)((\s*\<\/[a-z]+(\s[^\>]*)?\>\s*)+)/, 4],
			[/(\s+\<[a-z]+(\s[^\>]*)?\>|\<[a-z]+(\s[^\>]*)?\>\s+)((\s*\<[a-z]+(\s[^\>]*)?\>\s*)+)/, 4],
		], function(elements) {

			return elements.replace(/(^|>)\s+(\<|$)/g, '$1$2');

		}, false);
	}

	return template;
}

/*
	
	Handlebars Documentation: https://handlebarsjs.com/api-reference/compilation.html#handlebars-compile-template-options

*/
function generatePrecompileOptions(template, helpers = [], options = {})
{
	let knownHelpersOnly = true,
		knownHelpers = {};

	for(let i in helpers)
	{
		//if(new RegExp(escapeRegExp(helpers[i])).test(template))
		//	knownHelpersOnly = false;

		knownHelpers[helpers[i]] = true;
	}

	return {
		...{
			knownHelpers: knownHelpers,
			knownHelpersOnly: knownHelpersOnly,
			data: /@(?:root|first|index|key|last|level)/.test(template) ? true : false,
			assumeObjects: !/\{\{[^\}]+[a-z0-9]+\.[a-z0-9][^\}]+\}\}/i.test(template) ? true : false,
			strict: options.strictWithAssumeObjects && !/\{\{[^\}]+[a-z0-9]+\.[a-z0-9][^\}]+\}\}/i.test(template) && !/\{\{\^[^\}]+\}\}/.test(template) ? true : false,
		},
		...options
	};
}

function removeStrictLocation(precompiled)
{
	return precompiled.replace(/\,\s*\{['"]?s(?:tart)?['"]?:\{['"]?l(?:ine)['"]?:[0-9]+,['"]?c(?:olumn)['"]?:[0-9]+\},['"]?e(?:nd)['"]?:\{['"]?l(?:ine)['"]?:[0-9]+,['"]?c(?:olumn)['"]?:[0-9]+\}\}\s*/g, '');
}

function reduceStrictLocation(precompiled)
{
	return precompiled.replace(/\,\s*\{['"]?s(?:tart)['"]?:\{['"]?l(?:ine)['"]?:([0-9]+),['"]?c(?:olumn)['"]?:([0-9]+)\},['"]?e(?:nd)['"]?:\{['"]?l(?:ine)['"]?:([0-9]+),['"]?c(?:olumn)['"]?:([0-9]+)\}\}\s*/g, ',{start:{line:$1,column:$2},end:{line:$3,column:$4}}');
}

function shortStrictLocation(precompiled)
{
	return precompiled.replace(/\,\s*\{['"]?s(?:tart)['"]?:\{['"]?l(?:ine)['"]?:([0-9]+),['"]?c(?:olumn)['"]?:([0-9]+)\},['"]?e(?:nd)['"]?:\{['"]?l(?:ine)['"]?:([0-9]+),['"]?c(?:olumn)['"]?:([0-9]+)\}\}\s*/g, ',{s:{l:$1,c:$2},e:{l:$3,c:$4}}');
}

exports.minify = minifyHandlebarsTemplate;
exports.precompileOptions = generatePrecompileOptions;
exports.removeStrictLocation = removeStrictLocation;
exports.reduceStrictLocation = reduceStrictLocation;
exports.shortStrictLocation = shortStrictLocation;
