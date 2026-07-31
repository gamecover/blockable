const GAME_ASSET_URLS = Object.values(import.meta.glob(
  '../**/*.{png,jpg,jpeg,webp,gif,ttf,woff,woff2}',
  { eager: true, query: '?url', import: 'default' },
))

let preloadPromise = null
let loadedCount = 0
const progressListeners = new Set()

const reportProgress = () => {
  const progress = GAME_ASSET_URLS.length
    ? loadedCount / GAME_ASSET_URLS.length
    : 1
  progressListeners.forEach((listener) => listener(progress))
}

const preloadVisual = (url) => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = resolve
  image.onerror = () => reject(new Error(`이미지 로딩 실패: ${url}`))
  image.src = url
})

const preloadBinary = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`에셋 로딩 실패 (${response.status}): ${url}`)
  await response.blob()
}

const preloadAsset = async (url) => {
  if (/\.(png|jpe?g|webp|gif)(?:$|\?)/i.test(url)) await preloadVisual(url)
  else await preloadBinary(url)
  loadedCount += 1
  reportProgress()
}

export const preloadGameAssets = (onProgress) => {
  if (onProgress) {
    progressListeners.add(onProgress)
    onProgress(GAME_ASSET_URLS.length ? loadedCount / GAME_ASSET_URLS.length : 1)
  }
  if (!preloadPromise) {
    preloadPromise = Promise.all(GAME_ASSET_URLS.map(preloadAsset))
      .then(async () => {
        await document.fonts?.ready
        reportProgress()
      })
  }
  return preloadPromise.finally(() => {
    if (onProgress) progressListeners.delete(onProgress)
  })
}
