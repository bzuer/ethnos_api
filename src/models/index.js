const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const Organization = sequelize.define('organizations', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  short_name: {
    type: DataTypes.STRING(100),
  },
  type: {
    type: DataTypes.STRING(50),
  },
  country: {
    type: DataTypes.STRING(100),
  },
  region: {
    type: DataTypes.STRING(100),
  },
  city: {
    type: DataTypes.STRING(100),
  },
  website: {
    type: DataTypes.STRING(255),
  },
  ror_id: {
    type: DataTypes.STRING(100),
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const Person = sequelize.define('persons', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  given_names: {
    type: DataTypes.STRING(255),
  },
  family_name: {
    type: DataTypes.STRING(255),
  },
  name_variations: {
    type: DataTypes.TEXT,
  },
  orcid: {
    type: DataTypes.STRING(19),
  },
  lattes_id: {
    type: DataTypes.STRING(50),
  },
  scopus_id: {
    type: DataTypes.STRING(50),
  },
  wos_id: {
    type: DataTypes.STRING(50),
  },
  primary_affiliation_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Organization,
      key: 'id',
    },
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const Work = sequelize.define('works', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  original_title: {
    type: DataTypes.TEXT,
  },
  type: {
    type: DataTypes.STRING(50),
  },
  language: {
    type: DataTypes.STRING(10),
  },
  publication_year: {
    type: DataTypes.INTEGER,
  },
  publication_date: {
    type: DataTypes.DATE,
  },
  doi: {
    type: DataTypes.STRING(255),
  },
  isbn: {
    type: DataTypes.STRING(20),
  },
  issn: {
    type: DataTypes.STRING(20),
  },
  abstract: {
    type: DataTypes.TEXT,
  },
  keywords: {
    type: DataTypes.TEXT,
  },
  subjects: {
    type: DataTypes.TEXT,
  },
  pages: {
    type: DataTypes.STRING(50),
  },
  volume: {
    type: DataTypes.STRING(20),
  },
  issue: {
    type: DataTypes.STRING(20),
  },
  is_open_access: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  cited_by_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const Publication = sequelize.define('publications', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  issn: {
    type: DataTypes.STRING(20),
  },
  e_issn: {
    type: DataTypes.STRING(20),
  },
  publisher: {
    type: DataTypes.STRING(255),
  },
  type: {
    type: DataTypes.STRING(50),
  },
  subject_areas: {
    type: DataTypes.TEXT,
  },
  country: {
    type: DataTypes.STRING(100),
  },
  is_oa: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const Venue = sequelize.define('venues', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  display_name: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING(50),
  },
  issn_l: {
    type: DataTypes.STRING(20),
  },
  issn: {
    type: DataTypes.STRING(20),
  },
  publisher: {
    type: DataTypes.STRING(255),
  },
  is_oa: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const Authorship = sequelize.define('authorships', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  work_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Work,
      key: 'id',
    },
  },
  person_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Person,
      key: 'id',
    },
  },
  author_position: {
    type: DataTypes.INTEGER,
  },
  is_corresponding: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  affiliation_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Organization,
      key: 'id',
    },
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

Person.belongsTo(Organization, { 
  foreignKey: 'primary_affiliation_id', 
  as: 'primaryAffiliation' 
});

Organization.hasMany(Person, { 
  foreignKey: 'primary_affiliation_id', 
  as: 'members' 
});

Work.belongsToMany(Person, { 
  through: Authorship, 
  foreignKey: 'work_id',
  otherKey: 'person_id',
  as: 'authors'
});

Person.belongsToMany(Work, { 
  through: Authorship, 
  foreignKey: 'person_id',
  otherKey: 'work_id',
  as: 'works'
});

Work.hasMany(Authorship, { 
  foreignKey: 'work_id', 
  as: 'authorships' 
});

Person.hasMany(Authorship, { 
  foreignKey: 'person_id', 
  as: 'authorships' 
});

Authorship.belongsTo(Work, { 
  foreignKey: 'work_id', 
  as: 'work' 
});

Authorship.belongsTo(Person, { 
  foreignKey: 'person_id', 
  as: 'person' 
});

Authorship.belongsTo(Organization, { 
  foreignKey: 'affiliation_id', 
  as: 'affiliation' 
});

module.exports = {
  sequelize,
  Organization,
  Person,
  Work,
  Publication,
  Venue,
  Authorship,
};