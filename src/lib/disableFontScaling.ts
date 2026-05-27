import { Text, TextInput } from 'react-native';

const MAX_FONT_SCALE_MULTIPLIER = 1.2;

type ComponentWithDefaultProps = {
  defaultProps?: Record<string, unknown>;
};

function capFontScaling(Component: ComponentWithDefaultProps) {
  Component.defaultProps = {
    ...(Component.defaultProps || {}),
    allowFontScaling: true,
    maxFontSizeMultiplier: MAX_FONT_SCALE_MULTIPLIER,
  };
}

capFontScaling(Text as unknown as ComponentWithDefaultProps);
capFontScaling(TextInput as unknown as ComponentWithDefaultProps);
