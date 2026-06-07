import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HPGauge, StatField, CurrencyRow, ItemRow } from '../src/components';

describe('HPGauge', () => {
  it('renders current and max hp', () => {
    render(<HPGauge current={50} max={100} />);
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
  });
});

describe('StatField', () => {
  it('renders label and value', () => {
    render(<StatField label="STR" value={18} />);
    expect(screen.getByText('STR')).toBeInTheDocument();
    expect(screen.getByDisplayValue('18')).toBeInTheDocument();
  });
});

describe('CurrencyRow', () => {
  it('renders currency label and amount', () => {
    render(<CurrencyRow label="Gold" amount={150} />);
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });
});

describe('ItemRow', () => {
  it('renders item name and quantity', () => {
    render(<ItemRow name="Potion" quantity={5} />);
    expect(screen.getByText('Potion')).toBeInTheDocument();
    expect(screen.getByText('x5')).toBeInTheDocument();
  });
});
