alter table adicional drop check chk_adicional_quantidade;

alter table adicional
    drop foreign key fk_adicional_insumo,
    drop column id_insumo,
    drop column quantidade_consumida;
