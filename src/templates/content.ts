export const contentFileItem = `<item id="__ID__" href="__FILE__" media-type="application/xhtml+xml"/>`
export const contentCSSItem = `<item id="__ID__" href="__FILE__" media-type="text/css"/>`
export const contentImageItem = `<item id="__ID__" href="__FILE__" media-type="image/png"/>`
export const contentItemref = `<itemref idref="__ID__"/>`

export const contentFile =`<?xml version='1.0' encoding='utf-8'?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uuid_id" prefix="calibre: https://calibre-ebook.com">
<metadata xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:calibre="http://calibre.kovidgoyal.net/2009/metadata">
  <dc:title id="id">__TITLE__</dc:title>
  <dc:language>pl</dc:language>
</metadata>

<manifest>
__MANIFEST_ITEMS__
</manifest>

<spine>
__SPINE_ITEMS__
</spine>
</package>`