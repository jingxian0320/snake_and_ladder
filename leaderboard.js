// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Mongo.Collection("players");

if (Meteor.isClient) {
  Template.restart.events({
    'click .restart_button': function() {
      //Players.update({}, {$set: {score: 0}}, {multi: true});
      var playerlist = Players.find({});
      playerlist.forEach(function (player) {
        Players.update(player._id,{$set: {score: 0}})
      });
      //Players.find().collection.update({}, {$set: {score: 0}}, {multi: true});
      Session.set("end",false);
      Session.set("selectedPlayer",false);
    }
  });

  Template.leaderboard.helpers({
    players: function () {
      return Players.find({}, { sort: { name: 1 } });
    },
    selectedName: function () {
      var player = Players.findOne(Session.get("selectedPlayer"));
      return player && player.name;
    },
    endedGame: function () {
      return Session.get("end");
    }
  });

  Template.leaderboard.events({
    'click .inc': function () {
      var inc_score = Math.floor(Math.random() * 6 + 1)
      var player = Players.findOne(Session.get("selectedPlayer"));
      var prev_score = player.score;
      var set_score = prev_score + inc_score;
      if (set_score > 100){
        set_score = 200 - set_score
      } else if (set_score === 100){
        Session.set("end", true)
      }
    Players.update(Session.get("selectedPlayer"), {$set: {score: set_score}})

    }
  });

  Template.player.helpers({
    selected: function () {
      return Session.equals("selectedPlayer", this._id) ? "selected" : '';
    }
  });

  Template.player.events({
    'click': function () {
      if (Session.get("selectedPlayer")){
      }else{
        Session.set("selectedPlayer", this._id);
      }

    }
  });
}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Players.find().count() === 0) {
      Players.remove({});
      var names = ["Ada Lovelace", "Grace Hopper", "Marie Curie",
                   "Carl Friedrich Gauss"];
      _.each(names, function (name) {
        Players.insert({
          name: name,
          score: 0
        });
      });
    }
  });
}
