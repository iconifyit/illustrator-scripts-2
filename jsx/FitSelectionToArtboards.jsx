/*
  FitSelectionToArtboards.jsx for Adobe Illustrator
  Description: Proportional resizing of objects to fit one in each artboard
  Date: July, 2022
  Author: Sergey Osokin, email: hi@sergosokin.ru

  Installation: https://github.com/creold/illustrator-scripts#how-to-run-scripts

  Release notes:
  0.1 Initial version
  0.2 Added more options

  Donate (optional):
  If you find this script helpful, you can buy me a coffee
  - via DonatePay https://new.donatepay.ru/en/@osokin
  - via Donatty https://donatty.com/sergosokin
  - via YooMoney https://yoomoney.ru/to/410011149615582
  - via QIWI https://qiwi.com/n/OSOKIN
  - via PayPal (temporarily unavailable) http://www.paypal.me/osokin/usd

  NOTICE:
  Tested with Adobe Illustrator CC 2018-2022 (Mac), 2022 (Win).
  This script is provided "as is" without warranty of any kind.
  Free to use, not for sale

  Released under the MIT license
  http://opensource.org/licenses/mit-license.php

  Check other author's scripts: https://github.com/creold
*/

//@target illustrator
preferences.setBooleanPreference('ShowExternalJSXWarning', false); // Fix drag and drop a .jsx file

function main() {
  var SCRIPT = {
        name: 'Fit Selection To Artboards',
        version: 'v.0.2'
      },
      CFG = {
        paddings: 0,
        all: true,
        visBnds: preferences.getBooleanPreference('includeStrokeInBounds'),
        isFit: true,
        isRename: false,
        isScaleStroke: preferences.getBooleanPreference('scaleLineWeight'),
        units: getUnits(), // Active document units
        dlgMargins: [10, 15, 10, 8],
        dlgOpacity: .97 // UI window opacity. Range 0-1
      };

  var isRulerTopLeft = preferences.getBooleanPreference('isRulerOriginTopLeft'),
      isRulerInFourthQuad = preferences.getBooleanPreference('isRulerIn4thQuad');
  CFG.isFlipY = (isRulerTopLeft && isRulerInFourthQuad) ? true : false;

  if (!documents.length) {
    alert('Error\nOpen a document and try again');
    return;
  }

  if (!selection.length || selection.typename == 'TextRange') {
    alert('Error\nPlease, select one or more items');
    return;
  }

  // Dialog
  var dialog = new Window('dialog', SCRIPT.name + ' ' + SCRIPT.version);
      dialog.alignChildren = ['fill', 'fill'];
      dialog.opacity = CFG.dlgOpacity;

  // Artboards
  var absPnl = dialog.add('panel', undefined, 'Artboard');
      absPnl.orientation = 'row';
      absPnl.margins = CFG.dlgMargins;

  var allRb = absPnl.add('radiobutton', undefined, 'All empty');
  var activeRb = absPnl.add('radiobutton', undefined, 'Active');
  CFG.all ? allRb.value = true : activeRb.value = true;

  // Resize
  var fitPnl = dialog.add('panel', undefined, 'Resize selection');
      fitPnl.orientation = 'row';
      fitPnl.spacing = 45;
      fitPnl.margins = CFG.dlgMargins;

  var fitRb = fitPnl.add('radiobutton', undefined, 'Yes');
  var noFitRb = fitPnl.add('radiobutton', undefined, 'No');
  CFG.isFit ? fitRb.value = true : noFitRb.value = true;

  // Bounds
  var bndsPnl = dialog.add('panel', undefined, 'Selection bounds');
      bndsPnl.orientation = 'row';
      bndsPnl.margins = CFG.dlgMargins;
      bndsPnl.spacing = 25;

  var visRb = bndsPnl.add('radiobutton', undefined, 'Visible');
  var geomRb = bndsPnl.add('radiobutton', undefined, 'Geometric');
  CFG.visBnds ? visRb.value = true : geomRb.value = true;

  // Paddings
  var padGrp = dialog.add('group');
      padGrp.alignChildren = ['fill', 'center'];

  padGrp.add('statictext', undefined, 'Paddings, ' + CFG.units);
  var padInp = padGrp.add('edittext', undefined, CFG.paddings);
      padInp.preferredSize.width = 80;

  var isRename = dialog.add('checkbox', undefined, 'Rename artboards as items');
      isRename.value = CFG.isRename;

  var btns = dialog.add('group');
      btns.alignChildren = 'fill';
  var cancel = btns.add('button', undefined, 'Cancel', {name: 'cancel'});
  var ok = btns.add('button', undefined, 'Ok', {name: 'ok'});

  var copyright = dialog.add('statictext', undefined, 'Visit Github');
      copyright.justify = 'center';

  copyright.addEventListener('mousedown', function () {
    openURL('https://github.com/creold/');
  });

  cancel.onClick = dialog.close;
  ok.onClick = okClick;

  function okClick() {
    var doc = app.activeDocument,
        docAbs = doc.artboards,
        abIdx = docAbs.getActiveArtboardIndex(),
        abBnds = docAbs[abIdx].artboardRect,
        docSel = selection,
        item = docSel[0],
        paddings = convertUnits(padInp.text.toNum(CFG.paddings), CFG.units, 'px'),
        coord = app.coordinateSystem;

    app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;

    if (activeRb.value) {
      if (fitRb.value) {
        fitToArtboard(item, abBnds, visRb.value, CFG.isScaleStroke, paddings);
      }
      centerToArtboard(item, abBnds, CFG.isFlipY);
      if (isRename.value) {
        renameArtboard(item, docAbs[abIdx]);
      }
    } else {
      var emptyAbs = getEmptyArtboards(doc),
          len = Math.min(emptyAbs.length, docSel.length);

      for (var i = 0; i < len; i++) {
        item = docSel[i];
        abBnds = docAbs[emptyAbs[i]].artboardRect;
        docAbs.setActiveArtboardIndex(emptyAbs[i]);
        if (fitRb.value) {
          fitToArtboard(item, abBnds, visRb.value, CFG.isScaleStroke, paddings);
        }
        centerToArtboard(item, abBnds, CFG.isFlipY);
        if (isRename.value) {
          renameArtboard(item, docAbs[emptyAbs[i]]);
        }
      }
    }

    app.coordinateSystem = coord;
    selection = docSel;
    dialog.close();
  }

  dialog.center();
  dialog.show();
}

// Get the ruler units of the active document
function getUnits() {
  if (!documents.length) return '';
  switch (activeDocument.rulerUnits) {
    case RulerUnits.Pixels: return 'px';
    case RulerUnits.Points: return 'pt';
    case RulerUnits.Picas: return 'pc';
    case RulerUnits.Inches: return 'in';
    case RulerUnits.Millimeters: return 'mm';
    case RulerUnits.Centimeters: return 'cm';
    case RulerUnits.Unknown: // Parse new units only for the saved doc
      var xmp = activeDocument.XMPString;
      // Example: <stDim:unit>Yards</stDim:unit>
      if (/stDim:unit/i.test(xmp)) {
        var units = /<stDim:unit>(.*?)<\/stDim:unit>/g.exec(xmp)[1];
        if (units == 'Meters') return 'm';
        if (units == 'Feet') return 'ft';
        if (units == 'Yards') return 'yd';
      }
      break;
  }
  return 'px'; // Default
}

// Units conversion
function convertUnits(value, currUnits, newUnits) {
  return UnitValue(value, currUnits).as(newUnits);
}

// Polyfill for convert any string to a number
String.prototype.toNum = function (def) {
  var str = this;
  if (!def) def = 1;
  str = str.replace(/,/g, '.').replace(/[^\d.]/g, '');
  str = str.split('.');
  str = str[0] ? str[0] + '.' + str.slice(1).join('') : '';
  str = str.substr(0, 1) + str.substr(1).replace(/-/g, '');
  if (isNaN(str) || !str.length) return parseFloat(def);
  return parseFloat(str);
}

// Fit the item to the size of the artboard
function fitToArtboard(item, abBnds, isVisBnds, isStroke, paddings) {
  var orig = item;
  if (item.isType('group') && item.clipped) {
    item = getMaskPath(item);
  }

  var bnds = isVisBnds ? item.visibleBounds : item.geometricBounds,
      itemWidth = Math.abs(bnds[2] - bnds[0]),
      itemHeight = Math.abs(bnds[1] - bnds[3]),
      abWidth = Math.abs(abBnds[2] - abBnds[0]),
      abHeight = Math.abs(abBnds[1] - abBnds[3]);
  
  var ratioW = 100 * (abWidth - 2 * paddings) / itemWidth,
      ratioH = 100 * (abHeight - 2 * paddings) / itemHeight,
      ratio = Math.min(ratioW, ratioH);

  // X, Y, Positions, FillPatterns, FillGradients, StrokePattern, LineWidths
  orig.resize(ratio, ratio, true, true, true, true, (isVisBnds || isStroke) ? ratio : 100);
}

// Place the item in the center of the artboard
function centerToArtboard(item, abBnds, isFlipY) {
  var bnds = item.geometricBounds,
      itemSize = {
        left: bnds[0],
        top: bnds[1],
        inLeft: bnds[0],
        inTop: bnds[1],
        inRight: bnds[2],
        inBottom: bnds[3],
        h: 0,
        w: 0
      };

  if (item.isType('group') && item.clipped) {
    var mask = getMaskPath(item);
    bnds = mask.geometricBounds,
    itemSize.inLeft = bnds[0];
    itemSize.inTop = bnds[1];
    itemSize.inRight = bnds[2];
    itemSize.inBottom = bnds[3];
  }

  abWidth = Math.abs(abBnds[2] - abBnds[0]);
  abHeight = Math.abs(abBnds[1] - abBnds[3]);
  itemSize.h = Math.abs(itemSize.inTop - itemSize.inBottom);
  itemSize.w = Math.abs(itemSize.inRight - itemSize.inLeft);

  var left = itemSize.left - itemSize.inLeft,
      top = itemSize.top - itemSize.inTop,
      centerX = left + (abWidth - itemSize.w) / 2,
      centerY = top + (itemSize.h + (isFlipY ? -1 : 1) * abHeight) / 2;

  item.position = [centerX, centerY];
}

// Get the clipping mask
function getMaskPath(group) {
  for (var i = 0, len = group.pageItems.length; i < len; i++) {
    var currItem = group.pageItems[i];
    if (isClippingPath(currItem)) {
      return currItem;
    }
  }
}

// Check the clipping mask
function isClippingPath(item) {
  var clipText = (item.isType('text') &&
                  item.textRange.characterAttributes.fillColor == '[NoColor]' &&
                  item.textRange.characterAttributes.strokeColor == '[NoColor]');
  return (item.isType('compound') && item.pathItems[0].clipping) ||
          item.clipping || clipText;
}

// Rename the artboard as an item
function renameArtboard(item, ab) {
  var name = '';

  if (item.isType('text') && isEmpty(item.name) && !isEmpty(item.contents)) {
    name = item.contents.slice(0, 100);
  } else if (item.isType('symbol') && isEmpty(item.name)) {
    name = item.symbol.name;
  } else {
    name = item.name;
  }

  if (!isEmpty(name) && ab.name !== name) ab.name = name;
}

// Get empty artboards of the document
function getEmptyArtboards(doc) {
  var out = [];
  for (var i = 0, len = doc.artboards.length; i < len; i++) {
    selection = null;
    doc.artboards.setActiveArtboardIndex(i);
    doc.selectObjectsOnActiveArtboard();
    if (!selection.length) out.push(i);
  }
  return out;
}

// Check an empty string
function isEmpty(str) {
  return str.replace(/\s/g, '').length == 0;
}

// Polyfill for checking the item typename by short name
Object.prototype.isType = function (type) {
  var regexp = new RegExp(type, 'i');
  return regexp.test(this.typename);
}

// Open link in browser
function openURL(url) {
  var html = new File(Folder.temp.absoluteURI + '/aisLink.html');
  html.open('w');
  var htmlBody = '<html><head><META HTTP-EQUIV=Refresh CONTENT="0; URL=' + url + '"></head><body> <p></body></html>';
  html.write(htmlBody);
  html.close();
  html.execute();
}

try {
  main();
} catch (e) {}