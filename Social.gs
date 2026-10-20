/**
 * SOCIAL – auto-post to Facebook from the PULSE Google Sheet.
 *
 * How it works:
 *  1. In the PULSE app: Social Posts > open a post > MAKE SLIDES >
 *     SCHEDULE ON FACEBOOK. The text + slide pictures come here
 *     (pictures are saved in Drive > "PULSE Social Posts").
 *  2. A row is added to the SOCIAL QUEUE tab with the date and time.
 *  3. A timer (every 15 min) posts every row that is due to the
 *     Facebook Page, then fills in Status and the post link.
 *
 * One-time setup: menu Social Posts > Connect Facebook Page
 * (see the "Facebook Auto-Post – Setup Guide" note), then
 * Social Posts > Turn On Auto-Post.
 */

var SOCIAL_SHEET = 'SOCIAL QUEUE';
var SOCIAL_HEADERS = ['Post Date', 'Post Time', 'Platform', 'Title', 'Text', 'Picture Files',
  'Status', 'Posted At', 'Post Link', 'Error', 'Added'];
var SOCIAL_FOLDER_NAME = 'PULSE Social Posts';
var FB_API = 'https://graph.facebook.com/v23.0/';
var SOCIAL_PROP_PAGE_ID = 'FB_PAGE_ID';
var SOCIAL_PROP_PAGE_NAME = 'FB_PAGE_NAME';
var SOCIAL_PROP_PAGE_TOKEN = 'FB_PAGE_TOKEN';
var SOCIAL_PROP_FOLDER = 'SOCIAL_FOLDER_ID';

function socialAddMenu_() {
  SpreadsheetApp.getUi()
    .createMenu('Social Posts')
    .addItem('Connect Facebook Page (one-time)', 'socialConnectFacebook')
    .addItem('Test Facebook Connection', 'socialTestFacebook')
    .addSeparator()
    .addItem('Turn On Auto-Post (every 15 min)', 'socialAutoPostOn')
    .addItem('Turn Off Auto-Post', 'socialAutoPostOff')
    .addItem('Post Due Items Now', 'socialRunQueue')
    .addToUi();
}

// ---------------------------------------------------------------------
// Connect: turns a short Graph API Explorer token into a Page token
// that does not expire, and keeps only the Page token.
// ---------------------------------------------------------------------
function socialConnectFacebook() {
  var ui = SpreadsheetApp.getUi();
  var ask = function (title, text) {
    var r = ui.prompt(title, text, ui.ButtonSet.OK_CANCEL);
    return r.getSelectedButton() === ui.Button.OK ? r.getResponseText().trim() : null;
  };
  var appId = ask('Connect Facebook (1/3)', 'App ID (Meta for Developers > your app > App settings > Basic)');
  if (!appId) return;
  var secret = ask('Connect Facebook (2/3)', 'App secret (same page, click Show)');
  if (!secret) return;
  var shortToken = ask('Connect Facebook (3/3)', 'User access token from Graph API Explorer\n(with pages_manage_posts, pages_read_engagement, pages_show_list)');
  if (!shortToken) return;

  try {
    var longUser = socialFbGet_('oauth/access_token', {
      grant_type: 'fb_exchange_token', client_id: appId, client_secret: secret, fb_exchange_token: shortToken
    }).access_token;
    var pages = socialFbGet_('me/accounts', { fields: 'id,name,access_token', access_token: longUser }).data || [];
    if (!pages.length) { ui.alert('No Facebook Page found for this login. Make sure you ticked your Page when giving permission.'); return; }

    var page = pages[0];
    if (pages.length > 1) {
      var list = pages.map(function (p, i) { return (i + 1) + '. ' + p.name; }).join('\n');
      var n = Number(ask('Which Page?', list + '\n\nType the number'));
      if (!n || !pages[n - 1]) { ui.alert('Not connected – number not understood.'); return; }
      page = pages[n - 1];
    }
    var props = pulseProps_();
    props.setProperty(SOCIAL_PROP_PAGE_ID, page.id);
    props.setProperty(SOCIAL_PROP_PAGE_NAME, page.name);
    props.setProperty(SOCIAL_PROP_PAGE_TOKEN, page.access_token);
    socialSheet_();
    ui.alert('Connected ✓', 'Facebook Page: ' + page.name +
      '\n\nNext: Social Posts > Turn On Auto-Post.\n(The App secret was only used once and is not saved.)', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Could not connect', String(e.message || e), ui.ButtonSet.OK);
  }
}

function socialTestFacebook() {
  var ui = SpreadsheetApp.getUi();
  var s = socialStatus();
  if (!s.facebook) { ui.alert('Facebook is not connected yet. Use Social Posts > Connect Facebook Page.'); return; }
  try {
    var p = socialFbGet_(s.pageId, { fields: 'name,link', access_token: pulseProps_().getProperty(SOCIAL_PROP_PAGE_TOKEN) });
    ui.alert('Facebook OK ✓', 'Page: ' + p.name + '\n' + (p.link || '') +
      '\nAuto-post timer: ' + (s.autoPost ? 'ON' : 'OFF'), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Facebook problem', String(e.message || e) + '\n\nRun Connect Facebook Page again.', ui.ButtonSet.OK);
  }
}

// For the app: is Facebook connected?
function socialStatus() {
  var props = pulseProps_();
  return {
    facebook: !!props.getProperty(SOCIAL_PROP_PAGE_TOKEN),
    pageId: props.getProperty(SOCIAL_PROP_PAGE_ID) || '',
    pageName: props.getProperty(SOCIAL_PROP_PAGE_NAME) || '',
    autoPost: pulseApp_().getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'socialRunQueue'; })
  };
}

// ---------------------------------------------------------------------
// Queue (called by the app)
// data = {platform:'facebook', title, text, date:'yyyy-mm-dd', time:'HH:mm', images:[base64 jpeg…]}
// ---------------------------------------------------------------------
function socialQueuePost(data) {
  if (!data || !data.text) return { error: 'No post text' };
  var platform = String(data.platform || 'facebook').toLowerCase();
  if (platform !== 'facebook') return { error: 'Only Facebook auto-post is set up so far' };
  var when = socialParseWhen_(data.date, data.time);
  if (!when) return { error: 'Date or time not understood' };

  var ids = [];
  var images = (data.images || []).slice(0, 10);
  if (images.length) {
    var folder = socialFolder_().createFolder(
      Utilities.formatDate(when, Session.getScriptTimeZone(), 'yyyy-MM-dd') + ' ' + String(data.title || 'Post').slice(0, 60));
    images.forEach(function (b64, i) {
      var blob = Utilities.newBlob(Utilities.base64Decode(String(b64).replace(/^data:[^,]+,/, '')), 'image/jpeg', 'slide-' + (i + 1) + '.jpg');
      ids.push(folder.createFile(blob).getId());
    });
  }

  var sh = socialSheet_();
  sh.appendRow([when, Utilities.formatDate(when, Session.getScriptTimeZone(), 'HH:mm'), 'Facebook',
    String(data.title || ''), String(data.text), ids.join(','), 'Queued', '', '', '', new Date()]);
  var s = socialStatus();
  return { ok: true, when: Utilities.formatDate(when, Session.getScriptTimeZone(), 'EEE d MMM yyyy, h:mm a'),
    pictures: ids.length, connected: s.facebook, autoPost: s.autoPost };
}

// List for the app (latest first)
function socialQueue() {
  var sh = socialSheet_();
  if (sh.getLastRow() < 2) return { items: [] };
  var tz = Session.getScriptTimeZone();
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, SOCIAL_HEADERS.length).getValues();
  return { items: rows.map(function (r) {
    return { when: r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'dd/MM/yyyy') + ' ' + r[1] : String(r[0]),
      platform: r[2], title: r[3], status: r[6], link: r[8], error: r[9] };
  }).reverse().slice(0, 30) };
}

// ---------------------------------------------------------------------
// Timer: post everything that is due
// ---------------------------------------------------------------------
function socialAutoPostOn() {
  socialAutoPostOff(true);
  pulseApp_().newTrigger('socialRunQueue').timeBased().everyMinutes(15).create();
  SpreadsheetApp.getUi().alert('Auto-post is ON ✓ – due posts in SOCIAL QUEUE go out within 15 minutes of their time.');
}

function socialAutoPostOff(quiet) {
  pulseApp_().getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'socialRunQueue') pulseApp_().deleteTrigger(t);
  });
  if (quiet !== true) SpreadsheetApp.getUi().alert('Auto-post is OFF. Queued posts stay in SOCIAL QUEUE.');
}

function socialRunQueue() {
  var lock = pulseLock_();
  if (!lock.tryLock(5000)) return;   // another run is busy
  var done = 0, failed = 0;
  try {
    var sh = socialSheet_();
    if (sh.getLastRow() < 2) return;
    var now = new Date();
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, SOCIAL_HEADERS.length).getValues();
    rows.forEach(function (r, i) {
      if (String(r[6]) !== 'Queued' || !(r[0] instanceof Date) || r[0] > now) return;
      var rowNo = i + 2;
      try {
        var link = socialPostFacebook_(String(r[4]), String(r[5] || '').split(',').filter(String));
        sh.getRange(rowNo, 7, 1, 4).setValues([['Posted', new Date(), link, '']]);
        done++;
      } catch (e) {
        sh.getRange(rowNo, 7, 1, 4).setValues([['Failed', new Date(), '', String(e.message || e).slice(0, 300)]]);
        failed++;
      }
    });
  } finally {
    lock.releaseLock();
  }
  try {
    if (done || failed) SpreadsheetApp.getUi().alert('Facebook: ' + done + ' posted, ' + failed + ' failed (see SOCIAL QUEUE).');
  } catch (e) { /* timer – no screen */ }
}

// Text only, one picture, or several pictures (one post with all of them).
function socialPostFacebook_(text, fileIds) {
  var props = pulseProps_();
  var pageId = props.getProperty(SOCIAL_PROP_PAGE_ID), token = props.getProperty(SOCIAL_PROP_PAGE_TOKEN);
  if (!pageId || !token) throw new Error('Facebook not connected (Social Posts > Connect Facebook Page)');

  if (!fileIds.length) {
    return socialFbLink_(socialFbPost_(pageId + '/feed', { message: text, access_token: token }).id);
  }
  if (fileIds.length === 1) {
    var one = socialFbPost_(pageId + '/photos', { caption: text, access_token: token,
      source: DriveApp.getFileById(fileIds[0]).getBlob() });
    return socialFbLink_(one.post_id || one.id);
  }
  var media = {};
  fileIds.forEach(function (id, i) {
    var up = socialFbPost_(pageId + '/photos', { published: 'false', access_token: token,
      source: DriveApp.getFileById(id).getBlob() });
    media['attached_media[' + i + ']'] = JSON.stringify({ media_fbid: up.id });
  });
  media.message = text;
  media.access_token = token;
  return socialFbLink_(socialFbPost_(pageId + '/feed', media).id);
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function socialFbGet_(path, params) {
  var q = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  return socialFbRead_(UrlFetchApp.fetch(FB_API + path + '?' + q, { muteHttpExceptions: true }));
}

function socialFbPost_(path, payload) {
  return socialFbRead_(UrlFetchApp.fetch(FB_API + path, { method: 'post', payload: payload, muteHttpExceptions: true }));
}

function socialFbRead_(resp) {
  var out = {};
  try { out = JSON.parse(resp.getContentText()); } catch (e) { throw new Error('Facebook replied ' + resp.getResponseCode()); }
  if (out.error) throw new Error('Facebook: ' + (out.error.message || 'error') + (out.error.code ? ' (code ' + out.error.code + ')' : ''));
  return out;
}

function socialFbLink_(postId) {
  return postId ? 'https://www.facebook.com/' + postId : '';
}

function socialParseWhen_(date, time) {
  var d = String(date || '').trim(), t = String(time || '20:00').trim();
  var m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/) || d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  var tm = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m || !tm) return null;
  var y, mo, day;
  if (m[0].indexOf('-') > -1) { y = +m[1]; mo = +m[2]; day = +m[3]; } else { day = +m[1]; mo = +m[2]; y = +m[3]; }
  var when = new Date(y, mo - 1, day, +tm[1], +tm[2]);
  return isNaN(when) ? null : when;
}

function socialSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SOCIAL_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SOCIAL_SHEET);
    sh.getRange(1, 1, 1, SOCIAL_HEADERS.length).setValues([SOCIAL_HEADERS]).setFontWeight('bold')
      .setBackground('#0B2545').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.getRange('A2:A').setNumberFormat('dd/mm/yyyy');
    sh.getRange('H2:H').setNumberFormat('dd/mm/yyyy hh:mm');
    sh.getRange('K2:K').setNumberFormat('dd/mm/yyyy hh:mm');
    sh.setColumnWidth(5, 320);
  }
  return sh;
}

function socialFolder_() {
  var props = pulseProps_();
  var id = props.getProperty(SOCIAL_PROP_FOLDER);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* deleted – make a new one */ } }
  var f = DriveApp.createFolder(SOCIAL_FOLDER_NAME);
  props.setProperty(SOCIAL_PROP_FOLDER, f.getId());
  return f;
}
