// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Mongo.Collection("players");
Snakes = new Mongo.Collection("Snakes");
Ladders = new Mongo.Collection("Ladders");

function add_score(prev_score) {
  var inc_score = Math.floor(Math.random() * 6 + 1)
  var set_score = prev_score + inc_score;
  if (set_score > 100){
    set_score = 200 - set_score
  }
  return set_score
}

function check_snakes(score){
  var snakelist = Snakes.find({});
  var set_score = score;
  snakelist.forEach(function(snake){
    if (score === snake.start){
      set_score = snake.land;
    }
  })
  return set_score
}

function check_ladders(score){
  var ladderlist = Ladders.find({});
  var set_score = score;
  ladderlist.forEach(function(ladder){
    if (score === ladder.start){
      set_score = ladder.land
    }
  })
  return set_score
}


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
    var player = Players.findOne(Session.get("selectedPlayer"));
    var prev_score = player.score;
    var set_score = add_score(prev_score);
    set_score = check_snakes(set_score);
    set_score = check_ladders(set_score);
    Players.update(Session.get("selectedPlayer"), {$set: {score: set_score}});
    if (set_score === 100){
      Session.set("end", true)
    }
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
    if (Players.find().count() !== 4) {
      Players.remove({});
      var names = ["Ada Lovelace", "Grace Hopper", "Marie Curie",
                   "Carl Friedrich Gauss"];
      _.each(names, function (name) {
        Players.insert({
          name: name,
          score: 0
        });
      });
    };
    if (true) {
      Snakes.remove({});
      Snakes.insert({start:98,land:46});
      Snakes.insert({start:63,land:50});
      Snakes.insert({start:32,land:10});
    };

    if (true) {
      Ladders.remove({});
      Ladders.insert({start:28,land:48});
      Ladders.insert({start:56,land:80});
      Ladders.insert({start:67,land:92});
    }
  });
}
