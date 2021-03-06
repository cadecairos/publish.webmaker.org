'use strict';

function resolveType(dateStr) {
  var num = parseInt(dateStr, 10);
  return isNaN(num) ? dateStr : num;
}

function getDateFromStr(dateStr, id, table, column) {
  var date;

  if (!dateStr) {
    return null;
  }

  try {
    dateStr = resolveType(dateStr);
    date = new Date(dateStr);
    if (isNaN(date.valueOf())) {
      throw new Error('Date string is not valid');
    }
  } catch (e) {
    console.error('Record with `id` ' + id + ' ' +
                  'has an invalid entry for `' + column + '` ' +
                  'with value ' + dateStr + ' ' +
                  'in table `' + table + '`');
  } finally {
    return date;
  }
}

function getDatesFromRecord(record, table) {
  var id = record.id;
  var created = getDateFromStr(record.date_created, id, table, 'date_created');
  var updated = getDateFromStr(record.date_updated, id, table, 'date_updated');

  if (!created && updated) {
    created = updated;
  }

  if (created && !updated) {
    updated = created;
  }

  if (!created && !updated) {
    return;
  }

  return {
    created: created,
    updated: updated
  };
}

function copyDates(knex, Promise, table) {
  return knex(table)
  .select('id', 'date_created', 'date_updated')
  .then(function(records) {
    return Promise.map(records, function(record) {
      var id = record.id;
      var dates = getDatesFromRecord(record, table);

      if (!dates) {
        return;
      }

      return Promise.join(
        knex(table).update('_date_created', dates.created)
        .where('id', id)
        .whereNull('_date_created'),

        knex(table).update('_date_updated', dates.updated)
        .where('id', id)
        .whereNull('_date_updated')
      );
    });
  });
}

exports.up = function(knex, Promise) {
  return Promise.join(
    copyDates(knex, Promise, 'projects'),
    copyDates(knex, Promise, 'publishedProjects')
  );
};

exports.down = function (knex, Promise) {
  // Irreversible, as this can lead to permanent data loss.
  return Promise.resolve();
};
