const { User, Album, Song } = require('../models');
const { Op } = require('sequelize');

const getModel = (model) => {
  const models = {
    user: User,
    album: Album,
    song: Song,
  };

  return models[model];
};

const getOptions = (model) => {
  switch (model) {
    case 'user':
      return {
        include: [
          {
            model: Album,
            include: [
              {
                model: Song,
              },
            ],
          },
        ],
        order: [
          ['createdAt', 'DESC'],
          [Album, 'createdAt', 'DESC'],
          [Album, Song, 'position', 'ASC'],
        ],
      };
    case 'album':
      return {
        include: [
          {
            model: User,
          },
          {
            model: Song,
          },
        ],
        order: [
          ['createdAt', 'DESC'],
          [Song, 'position', 'ASC'],
        ],
      };
    case 'song':
      return {
        include: [
          {
            model: Album,
            include: [
              {
                model: User,
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      };
    default:
      return {};
  }
};

exports.create = async (req, res, model) => {
  const { body } = req;
  const Model = getModel(model);

  try {
    const response = await Model.create(body);

    res.status(200).send(response);
  } catch (err) {
    res.status(500).send({
      message: err.message ? `Error: ${err.message}` : 'Unexpected error',
    });
  }
};

exports.readAll = async (query, res, model) => {
  const Model = getModel(model);
  const options = getOptions(model);

  if (query.name) {
    if (query.exact && query.exact === 'true') {
      options.where = { name: query.name };
    } else {
      options.where = {
        name: {
          [Op.iLike]: `%${query.name}%`,
        },
      };
    }
  }
  if (query.limit) {
    options.limit = query.limit;
  }

  try {
    const response = await Model.findAll(options);

    res.status(200).send(response);
  } catch (err) {
    res.status(500).send({
      message: err.message ? `Error: ${err.message}` : 'Unexpected error',
    });
  }
};

exports.readById = async (id, res, model) => {
  const Model = getModel(model);
  const options = getOptions(model);

  try {
    const response = await Model.findByPk(id, options);

    if (!response) {
      res.status(404).send({ message: `The ${model} could not be found.` });
    } else {
      res.status(200).json(response);
    }
  } catch (err) {
    res.status(500).send({
      message: err.message ? `Error: ${err.message}` : 'Unexpected error',
    });
  }
};

exports.patch = async (data, id, res, model) => {
  const Model = getModel(model);

  try {
    const [updatedRows] = await Model.update(data, { where: { id } });

    if (updatedRows) {
      res.status(200).send();
    } else {
      res.status(404).send({ message: `The ${model} could not be found.` });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: err.message ? `Error: ${err.message}` : 'Unexpected error',
    });
  }
};

exports.delete = async (id, res, model) => {
  const Model = getModel(model);

  try {
    const deletedRows = await Model.destroy({ where: { id } });

    if (!deletedRows) {
      res.status(404).json({ message: `The ${model} could not be found.` });
    } else {
      res.status(204).send();
    }
  } catch (err) {
    res.status(500).send({
      message: err.message ? `Error: ${err.message}` : 'Unexpected error',
    });
  }
};
