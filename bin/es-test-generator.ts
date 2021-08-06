#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { mkdirSync, existsSync, writeFileSync, rmSync, readFileSync, rmdirSync } from 'fs'
import { resolve } from 'path'
import { spawn } from 'child_process'
import { extractConcreteValue } from "../src/expose.utils"
import { isEmpty, times } from 'lodash'
import { sync } from 'glob'

interface TestCase {
  input: any[]
  result?: any
  error?: string
}

const generateTest = async (projectRoot: string, filePath: string, callExpression: string, outputPath: string, argsNumber: number) => {
  const startTime = Date.now()

  const workDirectory = ensureWorkDirectory(projectRoot)

  generateTestFile(workDirectory, filePath, callExpression, argsNumber)

  await runExposeCommand(projectRoot, workDirectory, [
    '/source/expoSE',
    '/work/test.js'
  ])

  const testCases = await generateTestCases(projectRoot, workDirectory)

  generateJestTestFile(testCases, filePath, callExpression, outputPath)

  removeJalangiFiles(projectRoot)
  cleanupWorkingDirectory(projectRoot)
  console.log(`Finished generating test cases, total time taken: ${Date.now() - startTime} ms`)
}

const generateJestTestFile = (testCases: TestCase[], filePath: string, callExpression: string, outputPath: string) => {
  const testFileContent = `
import module from './${filePath}'

describe('${callExpression}', () => {
  test('${filePath + callExpression}', () => {
    ${testCases.map((testCase) => generateTestCaseLine(testCase, callExpression)).join('\n\t\t')}
  })
})
`
  writeFileSync(outputPath, testFileContent)
}

const removeJalangiFiles = (projectRoot: string) => {
  const files = sync('**/*_jalangi_.js*', { root: projectRoot })
  for (const file of files) {
    rmSync(file)
  }
}

const cleanupWorkingDirectory = (projectRoot: string) => {
  const workDirectory = projectRoot + '/.test-generator'
  if (!existsSync(workDirectory)) {
    return
  }

  const files = sync(workDirectory + '/**', { nodir: true })
  for (const file of files) {
    rmSync(file)
  }

  rmdirSync(workDirectory)
}

const ensureWorkDirectory = (projectRoot: string) => {
  const workDirectory = projectRoot + '/.test-generator'
  if (!existsSync(workDirectory)) {
    mkdirSync(workDirectory)
  }
  return workDirectory
}

const generateTestCaseLine = (testCase: TestCase, callExpression: string): string => {
  if (testCase.error) {
    return `expect(() => ${callExpression}(${testCase.input.map((argument) => JSON.stringify(argument)).join(', ')})).toThrow('${testCase.error.replace(/'/g, "\\'")}')`
  }

  return `expect(${callExpression}(${testCase.input.map((argument) => JSON.stringify(argument)).join(', ')})).toEqual(${JSON.stringify(testCase.result)})`
}

const generateTestCases = async (projectRoot: string, workDirectory: string) => {
  const exposeOutputFile = `${workDirectory}/inputs.json`
  if (!existsSync(exposeOutputFile)) {
    console.error('No expoSE output found, terminating')
    process.exit(1)
  }

  const argumentsAndReturns = readFileSync(exposeOutputFile).toString().split('\n').filter((line) => !isEmpty(line))

  return argumentsAndReturns.map(argString => {
    const runData = JSON.parse(argString)

    return {
      input: runData.input.map((argument: any) => extractConcreteValue(argument)),
      result: extractConcreteValue(runData.result),
      error: runData.error,
    }
  })
}

const generateTestFile = (workDirectory: string, filePath: string, callExpression: string, argsNumber: number) => {
  // TODO: read number of arguments (or require it as a parameter in the first version?
  const content = `
    var fs = require('fs');
    var S$ = require('S$');
    ${times(argsNumber, (i) => `var X${i} = S$.pureSymbol('X${i}');`).join('\n')}
    var module = require('/project/${filePath}')
    var safeJson = require('/source/Analyser/bin/Utilities/SafeJson.js')
    
      try {
        result = ${callExpression}(${times(argsNumber, (i) => `X${i}`).join(', ')});
        fs.appendFileSync(
        '/work/inputs.json', 
        Buffer.from(
          safeJson.stringify({ input: [${times(argsNumber, (i) => `X${i}`).join(', ')}], result: result }) + "\\n", 
          'utf-8'
        ));
      } catch (e) {
        fs.appendFileSync(
          '/work/inputs.json', 
          Buffer.from(
            safeJson.stringify({ input: [${times(argsNumber, (i) => `X${i}`).join(', ')}], error: e.message }) + "\\n", 
            'utf-8'
          )
        );
      }`

  writeFileSync(workDirectory + '/test.js', content)

  if (existsSync(workDirectory + '/inputs.json')) {
    rmSync(workDirectory + '/inputs.json')
  }
}

const runExposeCommand = (projectRoot: string, workDirectory: string, args: string[]) => {
  return new Promise<void>((resolve) => {

    const spawnArgs: [string, string[]] = ['docker', [
      'run',
      '-v',
      `${projectRoot}:/project`,
      '-v',
      `${workDirectory}:/work`,
      '-e',
      'EXPOSE_JSON_PATH=/work/output.json',
      'ayankovsky/expose:latest',
      ...args,
    ]]

    console.log(`Running expose: `, spawnArgs[0], ...spawnArgs[1])
    const expose = spawn(...spawnArgs)

    expose.stdout.on('data', (data) => {
      console.error(`expoSE: ${data}`)
    })
    expose.stderr.on('data', (data) => {
      console.error(`expoSE error: ${data}`)
    })

    expose.on('close', (code) => {
      if (code !== 0) {
        console.log(`expoSE process exited with code ${code}`);
      }

      resolve()
    })
  })
}

yargs(hideBin(process.argv))
  .command('generate <projectRoot> <fileName> <callExpression> <outputPath> [argsNumber]', 'generate tests', (yargs) => {
    return yargs
      .positional('projectRoot', {
        describe: 'Project Directory Root',
      })
      .positional('fileName', {
        describe: 'File to import test function from, relative to the project root',
        type: 'string',
      })
      .positional('callExpression', {
        describe: 'Call Expression',
        type: 'string',
      })
      .positional('outputPath', {
        describe: 'Output Path',
        type: 'string',
      })
      .positional('argsNumber', {
        describe: 'Number of arguments',
        type: 'string',
        default: '1',
      })
  }, (argv) => {
    const { projectRoot, fileName, callExpression, outputPath, argsNumber } = argv
    generateTest(resolve(projectRoot as string), fileName as string, callExpression!, resolve(outputPath as string), Number(argsNumber))
  })
  .demandCommand().recommendCommands()
  .argv

