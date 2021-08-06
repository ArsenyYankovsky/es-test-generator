import {extractConcreteValue} from "./expose.utils"

describe('expose-utils', () => {
  it.each([
    [[""], ['']],
    ["", ''],
    [{"concrete":"","symbolic":{"context":{"ctx":{"id":1,"_ptr":true}},"ast":{"id":30,"_ptr":true},"_fields":[],"checks":[]}}, ''],
    [{"concrete":{"0":"seed_string"},"_name":"X","_core":{"0":"seed_string"},"_set":{},"_lastIndex":1}, {0: 'seed_string'}],
    [{"concrete":{"0":0},"_name":"X","_core":{"0":0},"_set":{},"_lastIndex":1}, {"0":0}],
    [{"concrete":{"0":false},"_name":"X","_core":{"0":false},"_set":{},"_lastIndex":1}, {0:false}],
    [{"concrete":{"0":{"concrete":{"testProp":undefined},"_name":"X_elements_0_0","_core":{"testProp":undefined},"_set":{},"_lastIndex":1}},"_name":"X","_core":{"0":{"concrete":{"testProp":undefined},"_name":"X_elements_0_0","_core":{"testProp":undefined},"_set":{},"_lastIndex":1}},"_set":{},"_lastIndex":1}, {0:{"testProp":undefined}}],
    [{"concrete":{"0":{"concrete":{"testProp":[""]},"_name":"X_elements_0_0","_core":{"testProp":[""]},"_set":{},"_lastIndex":1}},"_name":"X","_core":{"0":{"concrete":{"testProp":[""]},"_name":"X_elements_0_0","_core":{"testProp":[""]},"_set":{},"_lastIndex":1}},"_set":{},"_lastIndex":1}, {0:{testProp: ['']}}]
  ])('%s to %s', (input: any, expectedOutput: any) => {
    expect(extractConcreteValue(input)).toEqual(expectedOutput)
  })
})
