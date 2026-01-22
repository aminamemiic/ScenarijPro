const { DataTypes } = require("sequelize");
const sequelize = require("../sequelize");

const Delta = sequelize.define("Delta", {
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
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lineId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  nextLineId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  oldName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  newName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  freezeTableName: true,
  timestamps: false
});

module.exports = Delta;
