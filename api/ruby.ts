import Kuroshiro from 'kuroshiro'
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji'
import path from 'path'
import {VercelRequest, VercelResponse} from '@vercel/node'

let instance = null

async function getInstance() {
    if (instance) {
        return instance
    } else {
        const kuroshiro = new Kuroshiro()
        await kuroshiro.init(
            new KuromojiAnalyzer({
                // for serverless deploy need to specify "dictPath"
                dictPath: path.resolve(
                    process.cwd(),
                    'node_modules/kuromoji/dict',
                ),
            }),
        )
        instance = kuroshiro
        return kuroshiro
    }
}

// https://github.com/hexenq/kuroshiro/blob/master/README.zh-cn.md#convertstr-options
type Config = {
    to: 'hiragana' | 'katakana' | 'romaji'
    mode: 'normal' | 'spaced' | 'okurigana' | 'furigana'
    romajiSystem: 'hepburn' | 'passport' | 'nippon'
}

async function convert_ro_ruby_character(text: string, config: Config) {
    const kuroshiro = await getInstance()
    return kuroshiro.convert(text, config)
}
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    // another common pattern
    // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )
    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }
    return await fn(req, res)
  }
  

module.exports = allowCors(async (req: VercelRequest, res: VercelResponse) => {
    const {
        text = 'こんにちは',
        to = 'hiragana',
        mode = 'okurigana',
        romajiSystem = 'hepburn',
    } = req.query
    Promise.all([
        convert_ro_ruby_character(text as string, {
            to: to as 'hiragana' | 'katakana' | 'romaji',
            mode: mode as 'normal' | 'spaced' | 'okurigana' | 'furigana',
            romajiSystem: romajiSystem as 'hepburn' | 'passport' | 'nippon',
        }),
        // add romaji for reading
        convert_ro_ruby_character(text as string, {
            to: 'romaji',
            mode: 'spaced',
            romajiSystem: romajiSystem as 'hepburn',
        }),
    ])
        .then((result) => {
            res.setHeader('Cache-Control', 's-maxage=86400');
            res.setHeader('content-type', 'application/json')
            // res.setHeader("content-type", "text/html");
            res.status(200).send(result)
        })
        .catch((err) => {
            res.status(500)
            res.statusMessage = err.message
        })
}
) 
