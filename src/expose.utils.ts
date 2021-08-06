import { isObject, mapValues } from "lodash"

export const extractConcreteValue = (value: any): any => {
  if (isObject(value) && value.hasOwnProperty('concrete')) {
    if (isObject((value as any).concrete)) {
      return mapValues((value as any).concrete, extractConcreteValue)
    } else {
      return (value as any).concrete
    }
  } else {
    return value
  }
}
