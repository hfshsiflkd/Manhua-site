// src/utils/pagination.js
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

exports.parsePagination = (query = {}) => {
  return {
    page: Number(query.page) || DEFAULT_PAGE,
    limit: Number(query.limit) || DEFAULT_LIMIT,
  };
};
