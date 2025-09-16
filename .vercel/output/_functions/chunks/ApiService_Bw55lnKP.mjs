function getPlayListInfoById(playListId) {
    return fetch(`/api/get-info-playlist.json?id=${playListId}`)
        .then(res => res.json());
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  getPlayListInfoById
}, Symbol.toStringTag, { value: 'Module' }));

export { _page as _, getPlayListInfoById as g };
