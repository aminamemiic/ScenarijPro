const { DataTypes } = require("sequelize");
const sequelize = require("../sequelize");

const Line = sequelize.define("Line", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lineId: {
    type: DataTypes.INTEGER
  },
  text: {
    type: DataTypes.TEXT
  },
  nextLineId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  scenarioId: {  
    type: DataTypes.INTEGER,
    references: {
      model: "Scenario",
      key: "id"
    }
  }
}, {
  freezeTableName: true,
  timestamps: false
});

module.exports = Line;
