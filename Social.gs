/**
 * SOCIAL – auto-post to Facebook from the PULSE Google Sheet.
 *
 * How it works:
 *  1. In the PULSE app: Social Posts > open a post > MAKE SLIDES >
 *     SCHEDULE POST (Facebook, Instagram or both). The text + slide pictures come here
 *     (pictures are saved in Drive > "PULSE Social Posts").
 *  2. A row is added to the SOCIAL QUEUE tab with the date and time.
 *  3. A timer (every 15 min) posts every row that is due to the
 *     Facebook Page and/or the Instagram Professional account linked
 *     to it, then fills in Status and the post link.
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
var SOCIAL_PROP_IG_ID = 'IG_USER_ID';
var SOCIAL_PROP_IG_NAME = 'IG_USERNAME';

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
// Connect: takes a System User token (or a short Graph API Explorer token,
// made long-lived first) and keeps only the Page token, which does not expire.
// ---------------------------------------------------------------------
function socialConnectFacebook() {
  var ui = SpreadsheetApp.getUi();
  var ask = function (title, text) {
    var r = ui.prompt(title, text, ui.ButtonSet.OK_CANCEL);
    return r.getSelectedButton() === ui.Button.OK ? r.getResponseText().trim() : null;
  };
  var token = ask('Connect Facebook (1/2)',
    'Paste the access token.\n\nBest: a System User token from Meta Business Settings (does not expire).\nOr: a user token from Graph API Explorer.');
  if (!token) return;
  var secret = ask('Connect Facebook (2/2)',
    'Only for a Graph API Explorer token: type the App ID and App secret like this:\n   APPID:SECRET\n\nSystem User token: leave EMPTY and press OK.');
  if (secret === null) return;

  try {
    var userToken = token;
    if (secret) {   // short Explorer token → long-lived, so the Page token never expires
      var parts = secret.split(':');
      if (parts.length !== 2) { ui.alert('Write it as APPID:SECRET (with a colon), or leave it empty.'); return; }
      userToken = socialFbGet_('oauth/access_token', {
        grant_type: 'fb_exchange_token', client_id: parts[0].trim(), client_secret: parts[1].trim(), fb_exchange_token: token
      }).access_token;
    }
    var pages = socialFbGet_('me/accounts', { fields: 'id,name,access_token', access_token: userToken }).data || [];
    if (!pages.length) { ui.alert('No Facebook Page found for this token. System User: assign your Page to it (Business Settings > System users > Assign assets). Explorer: tick your Page when giving permission.'); return; }

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
    var ig = socialFindInstagram_(page.id, page.access_token);
    socialSheet_();
    ui.alert('Connected ✓', 'Facebook Page: ' + page.name +
      '\nInstagram: ' + (ig && ig.id ? '@' + ig.username + ' ✓' : 'not found – ' + ig.error +
        '\n(Link your Instagram Professional account to this Page and give the token instagram_basic + instagram_content_publish, then connect again.)') +
      '\n\nNext: Social Posts > Turn On Auto-Post.\n(Only the Page key is saved – not your token or App secret.)', ui.ButtonSet.OK);
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
      '\nInstagram: ' + (s.instagram ? '@' + s.igName : 'not connected') +
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
    instagram: !!props.getProperty(SOCIAL_PROP_IG_ID),
    igName: props.getProperty(SOCIAL_PROP_IG_NAME) || '',
    autoPost: pulseApp_().getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'socialRunQueue'; })
  };
}

// ---------------------------------------------------------------------
// Queue (called by the app)
// data = {title, date:'yyyy-mm-dd', time:'HH:mm', images:[base64 jpeg…],
//         posts:[{platform:'facebook'|'instagram', text}]}
// (older apps send {platform, text} for one post – still accepted)
// ---------------------------------------------------------------------
function socialQueuePost(data) {
  if (!data) return { error: 'Nothing sent' };
  var posts = data.posts || [{ platform: data.platform || 'facebook', text: data.text }];
  posts = posts.filter(function (p) { return p && String(p.text || '').trim(); });
  if (!posts.length) return { error: 'No post text' };
  for (var k = 0; k < posts.length; k++) {
    var pl = String(posts[k].platform || '').toLowerCase();
    if (pl !== 'facebook' && pl !== 'instagram') return { error: 'Unknown platform: ' + pl };
    if (pl === 'instagram' && !(data.images || []).length) return { error: 'Instagram needs at least one picture' };
  }
  var when = socialParseWhen_(data.date, data.time);
  if (!when) return { error: 'Date or time not understood' };
  var tz = Session.getScriptTimeZone();

  var ids = [];
  var images = (data.images || []).slice(0, 10);
  if (images.length) {
    var folder = socialFolder_().createFolder(
      Utilities.formatDate(when, tz, 'yyyy-MM-dd') + ' ' + String(data.title || 'Post').slice(0, 60));
    images.forEach(function (b64, i) {
      var blob = Utilities.newBlob(Utilities.base64Decode(String(b64).replace(/^data:[^,]+,/, '')), 'image/jpeg', 'slide-' + (i + 1) + '.jpg');
      ids.push(folder.createFile(blob).getId());
    });
  }

  var sh = socialSheet_();
  posts.forEach(function (p) {
    var name = String(p.platform).toLowerCase() === 'instagram' ? 'Instagram' : 'Facebook';
    sh.appendRow([when, Utilities.formatDate(when, tz, 'HH:mm'), name,
      String(data.title || ''), String(p.text), ids.join(','), 'Queued', '', '', '', new Date()]);
  });
  var s = socialStatus();
  return { ok: true, when: Utilities.formatDate(when, tz, 'EEE d MMM yyyy, h:mm a'),
    pictures: ids.length, platforms: posts.map(function (p) { return p.platform; }),
    connected: s.facebook, instagram: s.instagram, autoPost: s.autoPost };
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
        var files = String(r[5] || '').split(',').filter(String);
        var link = String(r[2]) === 'Instagram' ? socialPostInstagram_(String(r[4]), files)
                                                : socialPostFacebook_(String(r[4]), files);
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
    if (done || failed) SpreadsheetApp.getUi().alert('Social posts: ' + done + ' posted, ' + failed + ' failed (see SOCIAL QUEUE).');
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
// Instagram (Professional account linked to the Facebook Page).
// Instagram fetches pictures from a public web link, so each slide is
// shared "anyone with the link" just while posting, then made private again.
// ---------------------------------------------------------------------
function socialFindInstagram_(pageId, pageToken) {
  var props = pulseProps_();
  var why = '';
  try {
    var r = socialFbGet_(pageId, { fields: 'instagram_business_account{id,username},connected_instagram_account{id,username}',
      access_token: pageToken });
    var ig = r.instagram_business_account || r.connected_instagram_account;
    if (ig && ig.id) {
      props.setProperty(SOCIAL_PROP_IG_ID, ig.id);
      props.setProperty(SOCIAL_PROP_IG_NAME, ig.username || '');
      return { id: ig.id, username: ig.username || '' };
    }
    why = 'Facebook says no Instagram account is linked to this Page';
  } catch (e) {
    why = String(e.message || e);   // usually a missing permission
  }
  props.deleteProperty(SOCIAL_PROP_IG_ID);
  props.deleteProperty(SOCIAL_PROP_IG_NAME);
  return { error: why };
}

function socialPostInstagram_(text, fileIds) {
  var props = pulseProps_();
  var igId = props.getProperty(SOCIAL_PROP_IG_ID), token = props.getProperty(SOCIAL_PROP_PAGE_TOKEN);
  if (!igId || !token) throw new Error('Instagram not connected (Social Posts > Connect Facebook Page)');
  if (!fileIds.length) throw new Error('Instagram needs at least one picture');
  var files = fileIds.map(function (id) { return DriveApp.getFileById(id); });
  files.forEach(function (f) { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); });
  try {
    var creation;
    if (files.length === 1) {
      creation = socialIgContainer_(igId, token, files[0], { caption: text });
    } else {
      var children = files.map(function (f) { return socialIgContainer_(igId, token, f, { is_carousel_item: 'true' }); });
      creation = socialFbPost_(igId + '/media', { media_type: 'CAROUSEL', children: children.join(','),
        caption: text, access_token: token }).id;
    }
    socialIgWait_(creation, token);
    var mediaId = socialFbPost_(igId + '/media_publish', { creation_id: creation, access_token: token }).id;
    try { return socialFbGet_(mediaId, { fields: 'permalink', access_token: token }).permalink || ''; }
    catch (e) { return 'https://www.instagram.com/'; }
  } finally {
    files.forEach(function (f) { try { f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) {} });
  }
}

// One picture container; tries two public Drive link styles.
function socialIgContainer_(igId, token, file, extra) {
  var urls = ['https://lh3.googleusercontent.com/d/' + file.getId(),
              'https://drive.google.com/uc?export=download&id=' + file.getId()];
  var lastErr;
  for (var i = 0; i < urls.length; i++) {
    var payload = { image_url: urls[i], access_token: token };
    Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
    try {
      var id = socialFbPost_(igId + '/media', payload).id;
      socialIgWait_(id, token);
      return id;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// Instagram prepares each picture before it can be published.
function socialIgWait_(containerId, token) {
  for (var i = 0; i < 12; i++) {
    var st = socialFbGet_(containerId, { fields: 'status_code', access_token: token }).status_code;
    if (st === 'FINISHED' || st === 'PUBLISHED') return;
    if (st === 'ERROR' || st === 'EXPIRED') throw new Error('Instagram could not use the picture (' + st + ')');
    Utilities.sleep(5000);
  }
  throw new Error('Instagram took too long to prepare the pictures');
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
