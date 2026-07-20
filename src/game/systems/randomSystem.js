export const shuffle = (items, random = Math.random) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export const pick = (items, random = Math.random) => items[Math.floor(random() * items.length)]
