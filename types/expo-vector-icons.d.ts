declare module '@expo/vector-icons' {
  import { ComponentType } from 'react';
  import { IconProps } from '@expo/vector-icons/build/createIconSet';

  export const Ionicons: ComponentType<IconProps<string>> & {
    glyphMap: Record<string, number>;
  };
}

