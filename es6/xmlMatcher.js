"use strict";
// res class responsibility is to parse the XML.
var DocUtils = require("./docUtils");
var _ = require("lodash");

var handleRecursiveCase = function (res) {
	/*
		 Because xmlTemplater is recursive (meaning it can call it self), we need to handle special cases where the XML is not valid:
		 For example with res string "I am</w:t></w:r></w:p><w:p><w:r><w:t>sleeping",
		 - we need to match also the string that is inside an implicit <w:t> (that's the role of replacerUnshift) (in res case 'I am')
		 - we need to match the string that is at the right of a <w:t> (that's the role of replacerPush) (in res case 'sleeping')
		 the test: describe "scope calculation" it "should compute the scope between 2 <w:t>" makes sure that res part of code works
		 It should even work if they is no XML at all, for example if the code is just "I am sleeping", in res case however, they should only be one match
		 */

	var replacerUnshift = function () {
		var pn = {array: Array.prototype.slice.call(arguments)};
		pn.array.shift();
		var match = pn.array[0] + pn.array[1];
		// add match so that pn[0] = whole match, pn[1]= first parenthesis,...
		pn.array.unshift(match);
		pn.array.pop();
		var offset = pn.array.pop();
		pn.offset = offset;
		pn.first = true;
		// add at the beginning
		res.matches.unshift(pn);
		return res.charactersAdded.unshift(0);
	};

	if (res.content.indexOf("<") === -1 && res.content.indexOf(">") === -1) {
		res.content.replace(/^()([^<>]*)$/, replacerUnshift);
	}

	var r = new RegExp(`^()([^<]+)<\/(?:${res.tagsXmlArrayJoined})>`);
	res.content.replace(r, replacerUnshift);

	var replacerPush = function () {
		var pn = {array: Array.prototype.slice.call(arguments)};
		pn.array.pop();
		var offset = pn.array.pop();
		pn.offset = offset;
		pn.last = true;
		// add at the end
		res.matches.push(pn);
		return res.charactersAdded.push(0);
	};

	r = new RegExp(`(<(?:${res.tagsXmlArrayJoined})[^>]*>)([^>]+)$`);
	res.content.replace(r, replacerPush);
	return res;
};

var xmlMatcher = function (content, tagsXmlArray) {
	var res = {};
	res.content = content;
	res.tagsXmlArray = tagsXmlArray;
	res.tagsXmlArrayJoined = res.tagsXmlArray.join("|");
	var regexp = new RegExp(`(<(?:${res.tagsXmlArrayJoined})[^>]*>)([^<>]*)</(?:${res.tagsXmlArrayJoined})>`, "g");
	res.matches = DocUtils.pregMatchAll(regexp, res.content);
	res.charactersAdded = ((() => {
		var result = [];
		var end = res.matches.length;
		for (var i = 0; i < end; i++) {
			result.push(0);
		}
		return result;
	})());
	return handleRecursiveCase(res);
};

var memoizer = function (content, tagsXmlArray) {
	return content + tagsXmlArray.join("|");
};

var memoized = _.memoize(xmlMatcher, memoizer);

module.exports = function (content, tagsXmlArray) {
	return _.cloneDeep(memoized(content, tagsXmlArray));
};
