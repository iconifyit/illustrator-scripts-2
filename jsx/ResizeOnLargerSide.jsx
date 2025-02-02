/*
  ResizeOnLargerSide.jsx for Adobe Illustrator
  Description: resize of the selected objects to the specified amount on the larger side
  Date: March, 2020
  Author: Sergey Osokin, email: hi@sergosokin.ru
  
  Installation: https://github.com/creold/illustrator-scripts#how-to-run-scripts
  
  Release notes:
  0.1 Initial version
  0.2 Fixed issues. Added support for clipping masks

  Donate (optional):
  If you find this script helpful, you can buy me a coffee
  - via DonatePay https://new.donatepay.ru/en/@osokin
  - via Donatty https://donatty.com/sergosokin
  - via YooMoney https://yoomoney.ru/to/410011149615582
  - via QIWI https://qiwi.com/n/OSOKIN
  - via PayPal (temporarily unavailable) http://www.paypal.me/osokin/usd

  NOTICE:
  Tested with Adobe Illustrator CC 2018-2021 (Mac), 2021 (Win).
  This script is provided "as is" without warranty of any kind.
  Free to use, not for sale

  Released under the MIT license
  http://opensource.org/licenses/mit-license.php
  
  Check other author's scripts: https://github.com/creold
*/

//@target illustrator
app.preferences.setBooleanPreference('ShowExternalJSXWarning', false); // Fix drag and drop a .jsx file

function main () {
  var CFG = {
        size: 512, // Default input
        units: getUnits(), // Active document units
        isBounds: app.preferences.getBooleanPreference('includeStrokeInBounds')
      };

  if (!documents.length) {
    alert('Error\nOpen a document and try again');
    return;
  }

  if (!selection.length || selection.typename == 'TextRange') {
    alert('Error\nPlease select atleast one object');
    return;
  }

  var newSize = prompt('Enter the size on the larger side (' + CFG.units + ')', CFG.size);
  
  // Prepare value
  if (!newSize.length) return;
  newSize = newSize.toNum(CFG.size);
  if (newSize == 0) return;
  newSize = convertUnits(newSize, CFG.units, 'px');

  for (var i = 0, len = selection.length; i < len; i++) {
    var item = selection[i],
        bnds, width, height, largeSide, ratio;

    // Calc ratio
    if (item.isType('text')) {
      var txtClone = item.duplicate(),
          txtOutline = txtClone.createOutline();
      bnds = CFG.isBounds ? txtOutline.visibleBounds : txtOutline.geometricBounds;
      txtOutline.remove();
    } else if (item.isType('group') && item.clipped) {
      bnds = CFG.isBounds ? getMaskPath(item).visibleBounds : getMaskPath(item).geometricBounds;
    } else {
      bnds = CFG.isBounds ? item.visibleBounds : item.geometricBounds;
    }

    width = Math.abs(bnds[2] - bnds[0]);
    height = Math.abs(bnds[3] - bnds[1]);
    largeSide = (height >= width) ? height : width;
    ratio = 100 / (largeSide / newSize);

    // X, Y, Positions, FillPatterns, FillGradients, StrokePattern, LineWidths
    item.resize(ratio, ratio, true, true, true, true, ratio);
  }
}

// Get active document ruler units
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

// Convert units of measurement
function convertUnits(value, currUnits, newUnits) {
  return UnitValue(value, currUnits).as(newUnits);
}

// Polyfill for convert any string to number
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

// Polyfill for checking the item typename by short name
Object.prototype.isType = function (type) {
  var regexp = new RegExp(type, 'i');
  return regexp.test(this.typename);
}

// Get clipping path in group
function getMaskPath(group) {
  for (var i = 0, len = group.pageItems.length; i < len; i++) {
    var item = group.pageItems[i];
    if (isClippingPath(item)) return item;
  }
}

// Check clipping property
function isClippingPath(item) {
  var clipText = (item.isType('text') &&
    item.textRange.characterAttributes.fillColor == '[NoColor]' &&
    item.textRange.characterAttributes.strokeColor == '[NoColor]');
  return (item.isType('compound') && item.pathItems[0].clipping) ||
    item.clipping || clipText;
}

try {
  main();
} catch (e) {}