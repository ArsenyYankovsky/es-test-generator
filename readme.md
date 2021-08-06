# ES Test Generator

An automatic test suite generator utilizing the [ExpoSE](https://github.com/ExpoSEJS/ExpoSE) symbolic executor.

This project is currently in a proof of concept state. Feel free to report any issues and submit pull requests.

## Prerequisites

- Docker

## Installation

```bash
npm i -g es-test-generator
```

or just let node install it using npx

## Usage

```bash
npx es-test-generator generate rootDir testFile modulePathExpression outputFile [argsNumber]
```

**rootDir** - Root directory of the project

**testFile** - File containing the function to generate tests for

**modulePathExpression** - 
A JavaScript expression generator will use to locate the test function.

See [module path expression examples](#Module-Path-Expression)

**outputFile** - Path to the output test suite

**argsNumber** - *optional* A number of arguments passed to the tested function

Example:
```bash
npx es-test-generator generate . test-file.js module ./output.test.js
```

## Module Path Expression

A JavaScript expression generator will use to locate the test function.

The generator needs to know which export function/method you want to test.


### Default export

**Test File**:
```typescript
const func = ...

export default func
```

**modulePathExpression**:
`module`

### Named export

**Test File**:
```typescript
export const func = ...
```

**modulePathExpression**:
`module.func`

### Exported class

**Test File**:
```typescript
export class Book ...
```

**modulePathExpression**:
`new module.Book().order`
