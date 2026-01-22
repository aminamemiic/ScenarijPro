const { DataTypes } = require("sequelize");
const sequelize = require("../sequelize");

const Checkpoint = sequelize.define("Checkpoint", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  scenarioId: {
    type: DataTypes.INTEGER,
    references: {
      model: "Scenario",
      key: "id"
    }
  },
  timestamp: {
    type: DataTypes.INTEGER,
    allowNull: false
  }, 
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  freezeTableName: true,
  timestamps: false
});

module.exports = Checkpoint;
