import * as emoji from 'node-emoji';
import * as z from 'zod';

import inputFile from './input.json' with { type: 'json' };

z.config(z.locales.en());

const schema = z.strictInterface({
  firstName: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) {
          return 'firstName is missing';
        }

        return "firstName isn't a string";
      },
    })
    .nonempty({ error: () => 'firstName is empty' }),
  lastName: z.string().nonempty({ error: 'lastName is empty' }),
  middleNames: z.array(z.string()).nonempty().nullable(),
  'middleNames2?': z.array(z.string()).nonempty(),
  phoneNumber: z.e164({ error: () => 'phoneNumber is invalid' }), // https://github.com/colinhacks/zod/pull/3476
  email: z.email({ pattern: z.regexes.html5Email }),
  street: z.templateLiteral([
    z.number({ error: () => 'building number invalid' }),
    ' ',
    z.string({ error: () => 'street name invalid' }),
  ]),
  checkbox: z.boolean().or(
    z.stringbool({
      truthy: ['true', 'checked'],
      falsy: ['false'],
    }),
  ),
});
type Schema = z.infer<typeof schema>;

try {
  const result = schema.parse(inputFile);

  console.log('Success', emoji.get('cat'));
  console.log(JSON.stringify(result, null, 4));
} catch (error: unknown) {
  console.log('Fail', emoji.get('cat'), '\n');

  if (error instanceof z.ZodError) {
    const additionalError = {
      input: 'test',
      message: 'Test',
      path: ['firstName'],
    } satisfies z.core.$ZodIssue;

    error.issues.push(additionalError);

    console.log(z.prettifyError(error));
    console.log(JSON.stringify(z.treeifyError(error), null, 4));
  }
}
