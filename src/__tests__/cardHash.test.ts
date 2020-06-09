import { JunoCardHash } from '../index';

test('it should generate a card hash', () => {
  const juno = new JunoCardHash('147F7394C05386B0CDDBB0EBBCFD30E325164D2FC4112A986AD988AA18014A3D', 'sandbox');

  return juno
    .getCardHash({
      holderName: 'José da Silva',
      cardNumber: '5253286010447710',
      securityCode: '172',
      expirationMonth: '09',
      expirationYear: '2021',
    })
    .then((cardHash: string) => {
      expect(typeof cardHash).toBe('string');
    });
});
