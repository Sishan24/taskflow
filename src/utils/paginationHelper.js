/**
 * Parses and clamps pagination parameters from a query object.
 *
 * Rules:
 * - Default page: 1, Clamped to minimum 1
 * - Default limit: 10, Clamped between 1 and 100
 * - Calculates skip offset for MongoDB queries
 *
 * @param {Object} query - Express req.query object
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function parsePagination(query = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (Number.isNaN(page) || page < 1) {
    page = 1;
  }

  if (Number.isNaN(limit) || limit < 1) {
    limit = 10;
  } else if (limit > 100) {
    limit = 100;
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export default parsePagination;
