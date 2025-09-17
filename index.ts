import * as emoji from 'node-emoji';
import { z } from 'zod';

import inputFile from './input.json' with { type: 'json' };

z.config(z.locales.en());

const schema = z
  .strictObject({
    firstName: z
      .string({
        error: (issue) => {
          if (issue.input === undefined) {
            return 'firstName is missing';
          }

          return "firstName isn't a string";
        },
      })
      .nonempty({
        error: (issue) => {
          if (issue.code === 'too_small') {
            return `firstName has less than ${issue.minimum} characters`;
          }
        },
      }),
    lastName: z.string().optional(),
    middleNames: z.preprocess(
      (value) => {
        if (typeof value !== 'string') {
          return value;
        }

        return value.split(' ');
      },
      z
        .array(z.string(), {
          error: (issue) => {
            if (issue.input === undefined) {
              return 'middleNames is missing. Please use null for optional values';
            }

            return "middleNames isn't a string";
          },
        })
        .nonempty({ error: () => 'middleNames is empty' })
        .nullable(),
    ),
    phoneNumber: z.e164({ error: () => 'phoneNumber is not a E.164 number' }), // https://github.com/colinhacks/zod/pull/3476
    email: z.email({ pattern: z.regexes.html5Email, error: () => 'email is invalid' }),
    street: z.templateLiteral([z.number().positive(), z.string()], {
      error: (issue) => {
        if (issue.input === undefined) {
          return 'street is missing';
        }

        return 'street is malformed';
      },
    }),
    city: z.string().nonempty({ error: () => 'city is invalid' }),
    // https://stackoverflow.com/questions/164979/regex-for-matching-uk-postcodes
    postCode: z.string().regex(new RegExp(/^([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}|GIR ?0A{2})$/), {
      error: () => 'postCode is invalid',
    }),
    requiresPassword: z
      .boolean()
      .or(
        z.stringbool({
          truthy: ['true', 'checked'],
          falsy: ['false'],
        }),
      )
      .default(true),
    password: z
      .string({
        error: (issue) => {
          if (issue.input === undefined) {
            return 'password is missing';
          }

          return "password isn't a string";
        },
      })
      .nonempty({
        error: (issue) => {
          if (issue.code === 'too_small') {
            return `password mustn't be empty`;
          }
        },
      })
      .nullable(),
  })
  // https://zod.dev/api?id=when
  // https://github.com/colinhacks/zod/issues/4598#issuecomment-3047547647
  .refine(({ requiresPassword, password }) => requiresPassword && password !== null, {
    message:
      'password must be provided if the user requires one and must be null if the user does not',
    path: ['password'],
    when(payload) {
      const passwordSchema = z
        .object({
          requiresPassword: z.literal(false),
          password: z.null(),
        })
        .or(
          z.object({
            requiresPassword: z.literal(true),
            password: z.string(),
          }),
        );

      return !passwordSchema.safeParse(payload.value).success;
    },
  });

type SchemaIn = z.input<typeof schema>;
type Schema = z.output<typeof schema>;

try {
  const result = schema.parse(inputFile);

  console.log('Success', emoji.get('cat'));
  console.log(JSON.stringify(result, null, 4));
} catch (error: unknown) {
  console.log('Fail', emoji.get('cat'), '\n');

  if (Error.isError(error)) {
    console.log(error.message);
  }

  if (error instanceof z.ZodError) {
    // const additionalError = {
    //   input: 'test',
    //   message: 'Test',
    //   path: ['firstName'],
    // } satisfies z.core.$ZodIssue;

    // error.issues.push(additionalError);

    const errorTree = z.treeifyError(error);

    console.log(z.prettifyError(error));
    console.log(JSON.stringify(errorTree.errors, null, 4));
  }
}
