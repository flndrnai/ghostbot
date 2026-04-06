import split2 from 'split2';
import { DockerFrameParser } from '../tools/docker.js';
import { mapLine, mapClaudeCodeLine, mapperMap } from './line-mappers.js';
import { Transform } from 'stream';

/**
 * Parse a Docker container log stream into normalized chat events.
 * Three-layer pipeline: DockerFrameParser → NDJSON splitter → agent mapper.
 *
 * @param {import('http').IncomingMessage} dockerLogStream - Raw Docker log stream
 * @param {string} [codingAgent='claude-code'] - Agent identifier for mapper selection
 * @yields {{ type: 'text'|'tool-call'|'tool-result'|'unknown'|'exit', ... }}
 */
export async function* parseHeadlessStream(dockerLogStream, codingAgent = 'claude-code') {
  const mapper = mapperMap[codingAgent] || mapClaudeCodeLine;

  // Layer 1: Docker frame decoder (multiplexed 8-byte headers → stdout text)
  const frameDecoder = new Transform({
    transform(chunk, _encoding, callback) {
      if (!this._parser) this._parser = new DockerFrameParser();
      const frames = this._parser.push(chunk);
      for (const frame of frames) {
        if (frame.stream === 'stdout') {
          this.push(frame.text);
        }
      }
      callback();
    },
  });

  // Layer 2: NDJSON line splitter
  const lineSplitter = split2();

  // Pipe: Docker log → frame decoder → line splitter
  dockerLogStream.pipe(frameDecoder).pipe(lineSplitter);

  // Layer 3: Line mapper → yield events
  for await (const line of lineSplitter) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const events = mapLine(trimmed, mapper);
    for (const event of events) {
      yield event;
    }
  }
}
