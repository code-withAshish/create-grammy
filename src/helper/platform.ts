import prompts from 'prompts';

export type Platform = 'deno' | 'node' | 'other'

export async function GetPlatform(): Promise<Platform> {
  const selected = await prompts<string>(
    {
      choices: [
        {
          title: 'Deno',
          value: 'deno',
        },
        {
          title: 'Node',
          value: 'node',
        },
        {
          title: 'Other',
          value: 'other',
        },
      ],
      message: 'Pick platform',
      name: 'platform',
      type: 'select',
    },
    {
      onCancel: () => {
        process.exit();
      },
    }
  );

  return selected['platform'];
}
