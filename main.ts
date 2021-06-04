import server from './server.ts'
import { Command } from 'https://deno.land/x/cmd@v1.2.0/mod.ts'
import { version } from './constants.ts'

const program = new Command('deadbase')

program.version(version, '-v, --version')

const startCommand = new Command('start').action(() => {
	server()
})

program.addCommand(startCommand)

program.parse(Deno.args)
