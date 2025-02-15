import {
	autodateFieldSchema,
	boolFieldSchema,
	dateFieldSchema,
	editorFieldSchema,
	emailFieldSchema,
	fileFieldSchema,
	jsonFieldSchema,
	numberFieldSchema,
	passwordFieldSchema,
	relationFieldSchema,
	selectFieldSchema,
	textFieldSchema,
	urlFieldSchema,
} from './field-handlers'
import config from '../../config.json'
import { toCamelCase } from '../utils'
import type { CollectionTypeName } from '../types'

export const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?Z$/

export const generateZodSchema = (
	includeSystemCollections = config.zodSchema.includeSystemCollections
) => {
	const collections = ($app.findAllCollections() as Array<core.Collection>).filter((c) => {
		return includeSystemCollections || !c.system
	})
	const collectionIdToIdSchemaMap = new Map(
		collections.map((collection) => {
			const idField = collection.fields.find((field) => field.name === 'id') as TextField
			return [collection.id, textFieldSchema(idField).replace('id: ', '')]
		})
	)
	const shouldAddDateRegex = collections.some(({ fields }) => {
		return fields.some((field) => field.type() === 'date' || field.type() === 'autodate')
	})

	let schema = ''
	for (const collection of collections) {
		schema += `export const ${toCamelCase(collection.name)}Schema = z.object({\n`

		for (const fieldOptions of collection.fields as Array<core.Field>) {
			const optional = !fieldOptions.required || fieldOptions.autogeneratePattern

			schema += `    `

			switch (fieldOptions.type() as CollectionTypeName) {
				case 'text':
					schema += textFieldSchema(fieldOptions as TextField)
					break
				case 'password':
					schema += passwordFieldSchema(fieldOptions as PasswordField)
					break
				case 'editor':
					schema += editorFieldSchema(fieldOptions as EditorField)
					break
				case 'number':
					schema += numberFieldSchema(fieldOptions as NumberField)
					break
				case 'bool':
					schema += boolFieldSchema(fieldOptions as BoolField)
					break
				case 'email':
					schema += emailFieldSchema(fieldOptions as EmailField)
					break
				case 'url':
					schema += urlFieldSchema(fieldOptions as URLField)
					break
				case 'date':
					schema += dateFieldSchema(fieldOptions as DateField)
					break
				case 'autodate':
					schema += autodateFieldSchema(fieldOptions as AutodateField)
					break
				case 'select':
					schema += selectFieldSchema(fieldOptions as SelectField)
					break
				case 'file':
					schema += fileFieldSchema(fieldOptions as FileField)
					break
				case 'relation':
					schema += relationFieldSchema({
						...(fieldOptions as RelationField),
						targetIdSchema: collectionIdToIdSchemaMap.get(
							(fieldOptions as RelationField).collectionId
						)!,
					})
					break
				case 'json':
					schema += jsonFieldSchema(fieldOptions as JSONField)
					break
			}

			schema += `${optional ? '.optional()' : ''},\n`
		}

		schema += '})\n\n'
	}

	return (
		"import { z } from 'zod'\n\n" +
		(shouldAddDateRegex ? `const DATETIME_REGEX = ${DATETIME_REGEX}\n\n` : '') +
		schema
	)
}

export const writeZodSchemaToFile = () => {
	const data = generateZodSchema()
	$os.writeFile(config.zodSchema.outputPath, data, 0o644 as any)
}
