const { DataTypes } = require("sequelize");
const sequelize = require("../sequelize");

const Scenario = sequelize.define("Scenario", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: false 
});

module.exports = Scenario;
