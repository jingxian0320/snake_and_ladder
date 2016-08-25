// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Mongo.Collection("players");
Snakes = new Mongo.Collection("Snakes");
Ladders = new Mongo.Collection("Ladders");

function cal_score(prev_score) {
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

function add_score(player_id){
  var player = Players.findOne(player_id);
  var prev_score = player.score;
  var set_score = cal_score(prev_score);
  set_score = check_snakes(set_score);
  set_score = check_ladders(set_score);
  var duplicatePlayer = duplicates(set_score);
  if (duplicatePlayer){
    Players.update(duplicatePlayer,{$set: {score: 0}})
  }
  Players.update(player_id, {$set: {score: set_score}});
  if (set_score === 100){
    Session.set("end", true)
  }
  Players.update(player_id, {$set: {step: (set_score - prev_score)}});
}

function duplicates(score){
  var playerlist = Players.find({});
  var prev_player = false;
  playerlist.forEach(function(player){
    if (score === player.score){
      prev_player = player._id
    }
  })
  return prev_player
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
      Session.set("playerTurn",false);
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
    turnName: function () {
      var player = Players.findOne(Session.get("playerTurn"));
      return player && player.name;
    },
    endedGame: function () {
      return Session.get("end");
    },
    isSelectedTurn: function(){
      return (Session.get("playerTurn") === Session.get("selectedPlayer"))
    }
  });

  Template.leaderboard.events({
    'click .inc': function () {

      myPlayer = Session.get("selectedPlayer")
      add_score(myPlayer)

      var playerlist = Players.find({});
      playerlist.forEach(function(player){
        if (player._id !== Session.get("selectedPlayer")){
          add_score(player._id);
        }
      })
    }
  });

  Template.player.helpers({
    selected: function () {
      return Session.equals("playerTurn", this._id) ? "selected" : '';
    }
  });

  Template.player.events({
    'click': function () {

      if (Session.get("selectedPlayer")){
      }
      else{
        Session.set("selectedPlayer", this._id);
        var playerlist = Players.find({}, { sort: { name: 1 } });
        var flag = true
        playerlist.forEach(function(player){
          if (player._id === Session.get("selectedPlayer")){
            Session.set("playerTurn",player._id)
            Session.set("end",false)
            flag = false;
          }
          if (flag){
            Session.set("playerTurn",player._id);
            add_score(player._id);
          }
        }
      )}
    }
  })
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
