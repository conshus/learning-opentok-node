const fs = require('fs');

var express = require('express');
var router = express.Router();
var path = require('path');
var _ = require('lodash');

// var apiKey = process.env.TOKBOX_API_KEY;
// var secret = process.env.TOKBOX_SECRET;

const appId = process.env.VONAGE_APP_ID;
// const privateKey = process.env.PRIVATE_KEY;
// const privateKey = fs.readFileSync('./.data/private.key');

let privateKey;

if (process.env.VONAGE_PRIVATE_KEY) {
  privateKey = process.env.VONAGE_PRIVATE_KEY
} else if (process.env.VONAGE_PRIVATE_KEY64){
  privateKey = Buffer.from(process.env.VONAGE_PRIVATE_KEY64, 'base64');
}

if (!appId || !privateKey) {
  console.error('=========================================================================================================');
  console.error('');
  console.error('Missing Vonage Application and/or Vonage Private key');
  console.error('Find the appropriate values for these by logging into your Vonage Dashboard at: https://dashboard.nexmo.com/applications');
  console.error('Then add them to ', path.resolve('.env'), 'or as environment variables' );
  console.error('');
  console.error('=========================================================================================================');
  process.exit();
}

// if (!apiKey || !secret) {
//   console.error('=========================================================================================================');
//   console.error('');
//   console.error('Missing TOKBOX_API_KEY or TOKBOX_SECRET');
//   console.error('Find the appropriate values for these by logging into your TokBox Dashboard at: https://tokbox.com/account/#/');
//   console.error('Then add them to ', path.resolve('.env'), 'or as environment variables' );
//   console.error('');
//   console.error('=========================================================================================================');
//   process.exit();
// }

// var OpenTok = require('opentok');
// var opentok = new OpenTok(apiKey, secret);

const Vonage = require('@vonage/server-sdk');
const vonage = new Vonage({
  applicationId: appId,
  privateKey: privateKey
});

// IMPORTANT: roomToSessionIdDictionary is a variable that associates room names with unique
// unique session IDs. However, since this is stored in memory, restarting your server will
// reset these values if you want to have a room-to-session association in your production
// application you should consider a more persistent storage

var roomToSessionIdDictionary = {};

// returns the room name, given a session ID that was associated with it
function findRoomFromSessionId(sessionId) {
  return _.findKey(roomToSessionIdDictionary, function (value) { return value === sessionId; });
}

router.get('/', function (req, res) {
  res.render('index', { title: 'Learning-OpenTok-Node' });
});

/**
 * GET /session redirects to /room/session
 */
router.get('/session', function (req, res) {
  res.redirect('/room/session');
});

/**
 * GET /room/:name
 */
router.get('/room/:name', async function (req, res) {
  var roomName = req.params.name;
  var sessionId;
  var token;
  console.log('attempting to create a session associated with the room: ' + roomName);

  // if the room name is associated with a session ID, fetch that
  if (roomToSessionIdDictionary[roomName]) {
    sessionId = roomToSessionIdDictionary[roomName];

    // generate token
    // token = opentok.generateToken(sessionId);
    token = vonage.video.generateClientToken(sessionId);
    res.setHeader('Content-Type', 'application/json');
    res.send({
      applicationId: appId,
      sessionId: sessionId,
      token: token
    });
  }
  // if this is the first time the room is being accessed, create a new session ID
  else {
    // opentok.createSession({ mediaMode: 'routed' }, function (err, session) {
    //   if (err) {
    //     console.log(err);
    //     res.status(500).send({ error: 'createSession error:' + err });
    //     return;
    //   }
    //
    //   // now that the room name has a session associated wit it, store it in memory
    //   // IMPORTANT: Because this is stored in memory, restarting your server will reset these values
    //   // if you want to store a room-to-session association in your production application
    //   // you should use a more persistent storage for them
    //   roomToSessionIdDictionary[roomName] = session.sessionId;
    //
    //   // generate token
    //   token = opentok.generateToken(session.sessionId);
    //   res.setHeader('Content-Type', 'application/json');
    //   res.send({
    //     apiKey: apiKey,
    //     sessionId: session.sessionId,
    //     token: token
    //   });
    // });

    try {
      const session = await vonage.video.createSession({ mediaMode:"routed" });

      // now that the room name has a session associated wit it, store it in memory
      // IMPORTANT: Because this is stored in memory, restarting your server will reset these values
      // if you want to store a room-to-session association in your production application
      // you should use a more persistent storage for them
      roomToSessionIdDictionary[roomName] = session.sessionId;

      // generate token
      token = vonage.video.generateClientToken(session.sessionId);
      res.setHeader('Content-Type', 'application/json');
      res.send({
        applicationId: appId,
        sessionId: session.sessionId,
        token: token
      });
    } catch(error) {
      console.error("Error creating session: ", error);
      res.status(500).send({ error: 'createSession error:' + error });
      return;
    }


  }
});

/**
 * POST /archive/start
 */
router.post('/archive/start', async function (req, res) {
  console.log('attempting to start archive: ');
  var json = req.body;
  var sessionId = json.sessionId;
  // opentok.startArchive(sessionId, { name: findRoomFromSessionId(sessionId) }, function (err, archive) {
  //   if (err) {
  //     console.error('error in startArchive');
  //     console.error(err);
  //     res.status(500).send({ error: 'startArchive error:' + err });
  //     return;
  //   }
  //   res.setHeader('Content-Type', 'application/json');
  //   res.send(archive);
  // });

  try {
    const archive = await vonage.video.startArchive(sessionId, { name: findRoomFromSessionId(sessionId) });
    console.log("archive: ", archive);
    res.setHeader('Content-Type', 'application/json');
    res.send(archive);
  } catch (error){
    console.error("error starting archive: ",error);
    res.status(500).send({ error: 'startArchive error:' + error });
  }
});

/**
 * POST /archive/:archiveId/stop
 */
router.post('/archive/:archiveId/stop', async function (req, res) {
  var archiveId = req.params.archiveId;
  console.log('attempting to stop archive: ' + archiveId);
  // opentok.stopArchive(archiveId, function (err, archive) {
  //   if (err) {
  //     console.error('error in stopArchive');
  //     console.error(err);
  //     res.status(500).send({ error: 'stopArchive error:' + err });
  //     return;
  //   }
  //   res.setHeader('Content-Type', 'application/json');
  //   res.send(archive);
  // });
  try {
    const archive = await vonage.video.stopArchive(archiveId);
    res.setHeader('Content-Type', 'application/json');
    res.send(archive);
  } catch (error){
    console.error("error stopping archive: ",error);
    res.status(500).send({ error: 'stopArchive error:', error });
  }

});

/**
 * GET /archive/:archiveId/view
 */
router.get('/archive/:archiveId/view', async function (req, res) {
  var archiveId = req.params.archiveId;
  console.log('attempting to view archive: ' + archiveId);
  // opentok.getArchive(archiveId, function (err, archive) {
  //   if (err) {
  //     console.error('error in getArchive');
  //     console.error(err);
  //     res.status(500).send({ error: 'getArchive error:' + err });
  //     return;
  //   }
  //
  //   if (archive.status === 'available') {
  //     res.redirect(archive.url);
  //   } else {
  //     res.render('view', { title: 'Archiving Pending' });
  //   }
  // });

  try {
    const archive = await vonage.video.getArchive(archiveId);
    if (archive.status === 'available') {
      res.redirect(archive.url);
    } else {
      res.render('view', { title: 'Archiving Pending' });
    }
  } catch (error){
    console.log("error viewing archive: ",error);
    res.status(500).send({ error: 'viewArchive error:' + error });
  }

});

/**
 * GET /archive/:archiveId
 */
router.get('/archive/:archiveId', async function (req, res) {
  var archiveId = req.params.archiveId;

  // fetch archive
  console.log('attempting to fetch archive: ' + archiveId);
  // opentok.getArchive(archiveId, function (err, archive) {
  //   if (err) {
  //     console.error('error in getArchive');
  //     console.error(err);
  //     res.status(500).send({ error: 'getArchive error:' + err });
  //     return;
  //   }
  //
  //   // extract as a JSON object
  //   res.setHeader('Content-Type', 'application/json');
  //   res.send(archive);
  // });

  try {
    const archive = await vonage.video.getArchive(archiveId);
    // extract as a JSON object
    res.setHeader('Content-Type', 'application/json');
    res.send(archive);
  } catch (error){
    console.error("error getting archive: ",error);
    res.status(500).send({ error: 'getArchive error:' + error });
  }

});

/**
 * GET /archive
 */
router.get('/archive', async function (req, res) {
  // var options = {};
  // if (req.query.count) {
  //   options.count = req.query.count;
  // }
  // if (req.query.offset) {
  //   options.offset = req.query.offset;
  // }

  let filter = {};
  if (req.query.count) {
    filter.count = req.query.count;
  }
  if (req.query.offset) {
    filter.offset = req.query.offset;
  }
  if (req.query.sessionId) {
    filter.sessionId = req.query.sessionId;
  }

  // list archives
  console.log('attempting to list archives');
  // opentok.listArchives(options, function (err, archives) {
  //   if (err) {
  //     console.error('error in listArchives');
  //     console.error(err);
  //     res.status(500).send({ error: 'infoArchive error:' + err });
  //     return;
  //   }
  //
  //   // extract as a JSON object
  //   res.setHeader('Content-Type', 'application/json');
  //   res.send(archives);
  // });

  try {
    const archives = await vonage.video.searchArchives(filter);
    // extract as a JSON object
    res.setHeader('Content-Type', 'application/json');
    res.send(archives);
  } catch (error){
    console.error("error listing archives: ",error);
    res.status(500).send({ error: 'listArchives error:' + error });
  }

});

module.exports = router;
