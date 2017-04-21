// converts the node style specifics to es6 style (this is only
// used to process the documentation)
const requiredToken = '__import_module__';
exports.onHandleCode = (ev) => {
  ev.data.code = ev.data.code
    .replace(/module\.exports = /g, 'export default ')
    .replace(/const (.*)require\((.*)\)/g, `const ${requiredToken}$1require($2)`)
    .replace(/\\\n../g, '');
};

// Customize HTML texting/formating
exports.onHandleHTML = (ev) => {
  ev.data.html = ev.data.html
  .replace('<header>', '<header><a href="./index.html"><img src="data/thumbnail.png" id="meboSmallLogo" width="40" height="40" align="top"/></a>')
  .replace('>Repository</a>', '>Mebo&nbsp;GitHub</a>')
  .replace(/#http#:\//g, `http:/`)
  .replace(new RegExp('https://mebo.github.io/docs/data/', 'g'), 'data/')
  .replace('Mebo API Document', 'Mebo')
  .replace('<img src="data/logo.png">', '<p align="center"><img src="data/logo.png"></p>')
  .replace('<img src="data/meboHi.png">', '<p align="center"><img src="data/meboHi.png"></p>')
  .replace('<img src="./image/search.png">', '<img src="data/docs/search.png">')
  .replace('<a href="identifiers.html">Reference</a>', '')
  .replace('data-ice="manualHeaderLink">Manual</a>', 'data-ice="manualHeaderLink">Intro</a>')
  .replace('./manual/index.html', './manual/overview/INTRODUCTION.html')
  .replace('"data/manual/INTRODUCTION.md"', '"manual/overview/INTRODUCTION.html"')
  .replace(new RegExp(requiredToken, 'g'), '')
  .replace(new RegExp('::none::', 'g'), '<img src="data/docs/value/none.png" title="none">')
  .replace(new RegExp('::null::', 'g'), '<img src="data/docs/value/null.png" title="null">')
  .replace(new RegExp('::true::', 'g'), '<img src="data/docs/value/true.png" title="true">')
  .replace(new RegExp('::false::', 'g'), '<img src="data/docs/value/false.png" title="false">')
  .replace(new RegExp('::auto::', 'g'), '<img src="data/docs/value/auto.png" title="auto">')
  .replace(new RegExp('::on::', 'g'), '<img src="data/docs/toggle/on.png" title="yes">')
  .replace(new RegExp('::off::', 'g'), '<img src="data/docs/toggle/off.png" title="no">')

  // adding the star button to the README displayed in the index page
  if (ev.data.html.indexOf(' alt="Esdocs"></a>' !== -1)){
    ev.data.html = ev.data.html
    .replace('</head>', '<link rel="icon" type="image/png" sizes="256x256" href="data/thumbnail.png"><script async defer src="https://buttons.github.io/buttons.js"></script></head>')
    .replace(' alt="Esdocs"></a>', ' alt=Esdocs"></a> <a class="github-button" href="https://github.com/meboHQ/mebo" data-icon="octicon-star" data-style="mega" data-count-href="/meboHQ/mebo/stargazers" data-count-api="/repos/meboHQ/mebo#stargazers_count" data-count-aria-label="# stargazers on GitHub" aria-label="Star Mebo on GitHub">Star</a>');
  }

  // replacing the domain that is hard coded in the INTRODUCTION to the relative doc location
  if (ev.data.html.indexOf('<div data-ice="manual" data-toc-name="overview">') !== -1){
    ev.data.html = ev.data.html
    .replace(new RegExp('https://mebo.github.io/docs/', 'g'), '');
    ev.data.html = ev.data.html.replace('indent-h1 manual-color manual-color-reference', 'indent-h1');
  }

  // removing the public column from the class summary
  if (ev.data.html.indexOf('<title data-ice="title">Index | Mebo</title>') !== -1){
    ev.data.html = ev.data.html
    .replace(new RegExp('<td>\n      <span class="access" data-ice="access">public</span>', 'g'), '<td style="display:none">')
    .replace(new RegExp('<td data-ice="title" colspan="3">Static Public Class Summary</td>', 'g'), '');
  }
};
