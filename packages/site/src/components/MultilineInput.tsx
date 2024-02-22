import type { ComponentProps, FC } from 'react';
import React from 'react';
import styled from 'styled-components';

type MultilineInputProps = {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
} & ComponentProps<'textarea'>;

const MultilineContainer = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-self: flex-start;
  background-color: ${(props) => props.theme.colors.background?.inverse};
  color: ${(props) => props.theme.colors.text?.inverse};
  font-weight: bold;
  margin-bottom: 2rem;
`;

export const MultilineInput: FC<MultilineInputProps> = ({
  label,
  ...props
}) => {
  return (
    <MultilineContainer>
      <textarea rows={25} cols={100} {...props} />
    </MultilineContainer>
  );
};
